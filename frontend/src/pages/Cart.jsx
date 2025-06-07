import React from 'react';
import './Cart.css';
import { useNavigate } from 'react-router-dom';

function Cart({ cart, inventory, setCart, handleDonate, donateMessage ,setDonateMessage}) {
  const navigate = useNavigate();

  const handleCartChange = (itemId, change) => {
    const item = inventory.find((i) => i.id === parseInt(itemId));
    if (!item) return;
    const currentQty = cart[itemId] || 0;
    const newQty = Math.max(0, Math.min(item.quantity, currentQty + change));
    setCart({ ...cart, [itemId]: newQty });
  };

  const handleCartManualInput = (itemId, value) => {
    const item = inventory.find((i) => i.id === parseInt(itemId));
    if (!item) return;
    const numeric = parseInt(value);
    const newQty = Math.max(0, Math.min(item.quantity, isNaN(numeric) ? 0 : numeric));
    setCart({ ...cart, [itemId]: newQty });
  };

  const handleRemoveFromCart = (itemId) => {
    const updatedCart = { ...cart };
    delete updatedCart[itemId];
    setCart(updatedCart);
  };

  return (
    <div className="cart-container">
      <h2>Donation Cart</h2>
      {donateMessage && <p className="message">{donateMessage}</p>}

      {Object.keys(cart).length === 0 ? (
        <p>No items selected for donation.</p>
      ) : (
        <div className="table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Expiry</th>
                <th>Available</th>
                <th>Donate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(cart).map(([id, qty]) => {
                const item = inventory.find((i) => i.id === parseInt(id));
                if (!item) return null;

                return (
                  <tr key={id}>
                    <td>{item.item_name}</td>
                    <td>{item.type}</td>
                    <td>{item.expiry_date.slice(0, 10)}</td>
                    <td>{item.quantity}</td>
                    <td>
                      <div className="cart-actions">
                        <button onClick={() => handleCartChange(id, -1)}>-</button>
                        <input
                          type="number"
                          value={qty === 0 ? '' : qty}
                          min="0"
                          max={item.quantity}
                          onChange={(e) => handleCartManualInput(id, e.target.value)}
                        />
                        <button onClick={() => handleCartChange(id, 1)}>+</button>
                      </div>
                    </td>
                    <td>
                      <button className="remove-btn" onClick={() => handleRemoveFromCart(id)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="cart-footer">
        <button onClick={() => {
          setDonateMessage("");
          navigate('/dashboard/donor', { state: { donationMode: true } });
}} className="back-btn">Back</button>
        <button
          onClick={handleDonate}
          disabled={Object.keys(cart).length === 0}
          className="donate-button"
        >
          Finalize Donation
        </button>
      </div>
    </div>
  );
}

export default Cart;
