import React from 'react';
import './Cart.css'; // Reusing same CSS
import { useNavigate } from 'react-router-dom';
import { useRemoveCart } from '../context/RemoveCartContext';

function RemoveCart({ inventory, setInventory }) {
  const { removeCart, setRemoveCart } = useRemoveCart();
  const navigate = useNavigate();

  const handleQtyChange = (itemId, change) => {
    const item = inventory.find((i) => i.id === parseInt(itemId));
    if (!item) return;
    const currentQty = removeCart[itemId]?.quantity || 0;
    const newQty = Math.max(0, Math.min(currentQty + change, item.quantity));
    if (newQty === 0) {
      const { [itemId]: _, ...rest } = removeCart;
      setRemoveCart(rest);
    } else {
      setRemoveCart({
        ...removeCart,
        [itemId]: { ...item, quantity: newQty },
      });
    }
  };

  const handleManualInput = (itemId, value) => {
    const item = inventory.find((i) => i.id === parseInt(itemId));
    if (!item) return;
    const numeric = parseInt(value);
    const newQty = Math.max(0, Math.min(item.quantity, isNaN(numeric) ? 0 : numeric));
    if (newQty === 0) {
      const { [itemId]: _, ...rest } = removeCart;
      setRemoveCart(rest);
    } else {
      setRemoveCart({
        ...removeCart,
        [itemId]: { ...item, quantity: newQty },
      });
    }
  };

  const handleRemoveItem = (itemId) => {
    const updatedCart = { ...removeCart };
    delete updatedCart[itemId];
    setRemoveCart(updatedCart);
  };

  const handleConfirmRemoval = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/inventory/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: Object.values(removeCart).map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove items');
      
      setRemoveCart({});
      fetchInventory();
      navigate('/dashboard/donor');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/inventory', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
    }
  };

  return (
    <div className="cart-container">
      <h2>Used Items Summary</h2>
      {Object.keys(removeCart).length === 0 ? (
        <p>No items selected for removal.</p>
      ) : (
        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Expiry</th>
                <th>Available</th>
                <th>Remove</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(removeCart).map(([id, item]) => {
                const inventoryItem = inventory.find((i) => i.id === parseInt(id));
                if (!inventoryItem) return null;

                return (
                  <tr key={id}>
                    <td>{item.item_name}</td>
                    <td>{item.type}</td>
                    <td>{item.expiry_date.slice(0, 10)}</td>
                    <td>{inventoryItem.quantity}</td>
                    <td>
                      <div className="cart-actions">
                        <button onClick={() => handleQtyChange(id, -1)}>-</button>
                        <input
                          type="number"
                          value={item.quantity === 0 ? '' : item.quantity}
                          min="0"
                          max={inventoryItem.quantity}
                          onChange={(e) => handleManualInput(id, e.target.value)}
                        />
                        <button onClick={() => handleQtyChange(id, 1)}>+</button>
                      </div>
                    </td>
                    <td>
                      <button className="remove-btn" onClick={() => handleRemoveItem(id)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="cart-footer">
        <button
          onClick={() => navigate('/dashboard/donor', { state: { removeMode: true } })}
          className="back-btn"
        >
          Back
        </button>
        <button
          onClick={handleConfirmRemoval}
          disabled={Object.keys(removeCart).length === 0}
          className="donate-button"
        >
          Confirm Removal
        </button>
      </div>
    </div>
  );
}

export default RemoveCart;
