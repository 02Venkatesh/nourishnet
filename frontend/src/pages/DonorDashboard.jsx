import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import './DonorDashboard.css';
import { useRemoveCart } from '../context/RemoveCartContext';
function DonorDashboard({ inventory, setInventory, cart, setCart }) {
  const [form, setForm] = useState({
    item_name: '',
    expiry_date: '',
    quantity: '',
    type: '',
  });
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [donationMode, setDonationMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [removeMode, setRemoveMode] = useState(false);
const { removeCart, setRemoveCart } = useRemoveCart();
const navigate = useNavigate();

const toggleRemoveMode = () => {
  setRemoveMode(!removeMode);
  if (!removeMode) setRemoveCart({});
};

const handleRemoveQtyChange = (item, delta) => {
  setRemoveCart((prev) => {
    const existing = prev[item.id]?.quantity || 0;
    const newQty = Math.max(0, Math.min(existing + delta, item.quantity));
    if (newQty === 0) {
      const { [item.id]: _, ...rest } = prev;
      return rest;
    }
    return {
      ...prev,
      [item.id]: { ...item, quantity: newQty,quantityAvailable: item.quantity },
    };
  });
};

const goToRemoveCart = () => {
  if (Object.keys(removeCart).length === 0) return;
 navigate('/dashboard/donor/remove-cart', { state: { removeMode: true } });
};




  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('https://nourishnet-backend-wgz2.onrender.com/api/inventory/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add product');
      setForm({ item_name: '', expiry_date: '', quantity: '', type: 'grocery' });
      fetchInventory();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('https://nourishnet-backend-wgz2.onrender.com/api/inventory', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  setInventory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
    }
  };
  useEffect(() => {
  if (location.state?.donationMode) {
    setDonationMode(true);
  }
  if (location.state?.removeMode) {
    setRemoveMode(true);
  }
  window.history.replaceState({}, document.title);
  
}, [location.state]);
  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (!Array.isArray(inventory)) return; 
  const today = new Date();
  const applyFilters = inventory
    .filter((item) => {
      const expiry = new Date(item.expiry_date);
      const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      let status = 'fresh';
      if (daysLeft < 0) status = 'expired';
      else if (daysLeft <= 3) status = 'expiring';

      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());

      return (
        matchesSearch &&
        (filterStatus === 'all' || status === filterStatus) &&
        (filterType === 'all' || item.type === filterType)
      );
    })
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    
  setFiltered(applyFilters);
}, [filterStatus, filterType, inventory, searchQuery]);


  const handleCartChange = (itemId, change) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const today = new Date();
  const expiry = new Date(item.expiry_date);

  if (expiry < today.setHours(0, 0, 0, 0)) {
    alert("Cannot add expired items to donation cart.");
    return;
  }
    const currentQty = cart[itemId] || 0;
    const newQty = Math.max(0, Math.min(item.quantity, currentQty + change));
    setCart({ ...cart, [itemId]: newQty });
  };

  const handleCartManualInput = (itemId, value) => {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const numeric = parseInt(value);
    const newQty = Math.max(0, Math.min(item.quantity, isNaN(numeric) ? 0 : numeric));
    setCart({ ...cart, [itemId]: newQty });
  };

  const handleDonationToggle = () => {
    if (donationMode) {
    setCart({});
  }
    setDonationMode(!donationMode);

  };

  const handleViewCart = () => {
    localStorage.setItem('donationCart', JSON.stringify(cart));
    navigate('cart', { state: { donationMode: true } }); // instead of navigate('/dashboard/cart');

  };
  const handleLogout = () => {
  localStorage.removeItem('token');
  navigate('/');
};
  return (
    <div className="dashboard-container">
      <div className="logout-container">
  <button onClick={handleLogout} className="logout-btn">Logout</button>
</div>

      <div className="center-button"><button 
  onClick={() => navigate('/dashboard/donor/donations')} 
  className="donation-history-btn"
>
  View My Donations
</button>
</div>

      <h2>Add a New Product</h2>
      {message && <p className="message">{message}</p>}
      <form onSubmit={handleSubmit} className="form-card">
        <input
          type="text"
          name="item_name"
          placeholder="Product Name"
          value={form.item_name}
          onChange={handleChange}
          required
        />
        
        <div className="date-input-wrapper">
          Expiry Date
          <input
            type="date"
            name="expiry_date"
            value={form.expiry_date}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className="date-input"
            required
          />
          {/*
            This <span> sits on top of the input box and reads “Expiry Date”.
            We only render it while form.expiry_date is empty.
            As soon as a date is picked, form.expiry_date !== '' → it disappears.
          */}
          
        </div>
        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={form.quantity}
          onChange={handleChange}
          required
        />
          <select name="type" value={form.type} onChange={handleChange} required>
          <option value="" disabled hidden>
            Select Food Type
          </option>
          <option value="grocery">Grocery</option>
          <option value="cooked">Cooked</option>
        </select>
        <button type="submit">Add Product</button>
      </form>

      <h2>My Inventory</h2>
      <div className="filters">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="fresh">Fresh</option>
          <option value="expiring">Expiring</option>
          <option value="expired">Expired</option>
        </select>

        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="grocery">Grocery</option>
          <option value="cooked">Cooked</option>
        </select>
      </div>
      <div className="remove-buttons-wrapper">
      <button onClick={toggleRemoveMode} className="remove-toggle">{removeMode ? 'Cancel Remove' : 'Remove Items'}</button>
      </div>
      <div className="center-button">
  <button
    className="donate-button"
    onClick={handleDonationToggle}
  >
    {donationMode ? 'Cancel Donation' : 'Donate Now'}
  </button>
</div>

      <div className="search-container">
  <input
    type="text"
    placeholder="Search by item name..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
</div>


      <div className="table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Quantity</th>
              <th>Type</th>
              <th>Expiry</th>
              <th>Status</th>
              {donationMode && <th>Add to Cart</th>}
              {removeMode && <th>Remove Items</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={donationMode ? 6 : 5}>No items match your filters.</td>
              </tr>
            ) : (
              filtered.map((item) => {
  const expiry = new Date(item.expiry_date);
  const today = new Date();
  const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  let status = 'Fresh';
  if (daysLeft < 0) status = 'Expired';
  else if (daysLeft <= 3) status = 'Expiring';

  // If expired, apply the “expired-row” class:
  const rowClass = daysLeft < 0 ? 'expired-row' : '';

  return (
    <tr key={item.id} className={rowClass}>
      <td>{item.item_name}</td>
      <td>{item.quantity}</td>
      <td>{item.type}</td>
      <td>{item.expiry_date.slice(0, 10)}</td>
      <td>{status}</td>
      {donationMode && (
        <td>
          <div className="cart-actions">
            <button onClick={() => handleCartChange(item.id, -1)}>-</button>
            <input
              type="number"
              value={cart[item.id] || ''}
              placeholder="0"
              min="0"
              max={item.quantity}
              onChange={(e) => handleCartManualInput(item.id, e.target.value)}
            />
            <button onClick={() => handleCartChange(item.id, 1)}>+</button>
          </div>
        </td>
      )}
      {removeMode && (
        <td>
          <div className="cart-actions">
            <button onClick={() => handleRemoveQtyChange(item, -1)}>-</button>
            <input
              type="number"
              value={removeCart[item.id]?.quantity || 0}
              placeholder="0"
              min="0"
              max={item.quantity}
              onChange={(e) => handleCartManualInput(item.id, e.target.value)}
            />
            <button onClick={() => handleRemoveQtyChange(item, 1)}>+</button>
          </div>
        </td>
      )}
    </tr>
  );
})

            )}
          </tbody>
        </table>
      </div>

      {donationMode && Object.keys(cart).length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="view-cart-button" onClick={handleViewCart}>
            View Cart
          </button>
        </div>
      )}
      <div className="remove-buttons-wrapper">
      {removeMode && Object.keys(removeCart).length > 0 && (
  <button onClick={goToRemoveCart} className="view-remove-cart">View Used Cart</button>
)}
    </div>
    </div>
  );
}

export default DonorDashboard;
