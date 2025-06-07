import React, { useEffect, useState } from 'react';
import DonorDashboard from './DonorDashboard';
import Cart from './Cart';
import RemoveCart from './RemoveCart';
import SelectPickupLocation from './SelectPickupLocation'; 
import { Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms)); 
function DashboardWithCart() {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState({});
  const [donateMessage, setDonateMessage] = useState('');
  const navigate = useNavigate();
  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/inventory/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInventory(data);
      console.log("Fetched inventory from backend:", data);

    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
    }
  };

  const handleDonate = async () => {
  const itemsToDonate = Object.entries(cart).map(([itemId, qty]) => ({
    item_id: itemId,
    quantity: qty,
  }));

  // ✅ Just navigate to pickup-location and pass items
  navigate('/dashboard/donor/pickup-location', {
    state: { itemsToDonate },
  });
};



 useEffect(() => {
  fetchInventory();
}, []);  // ✅ Correct


  return (
    <Routes>
      <Route
        path="/"
        element={
          <DonorDashboard
            inventory={inventory}
            setInventory={setInventory}
            cart={cart}
            setCart={setCart}
          />
        }
      />
      <Route
        path="/cart"
        element={
          <Cart
            cart={cart}
            inventory={inventory}
            setCart={setCart}
            handleDonate={handleDonate}
            donateMessage={donateMessage}
            setDonateMessage={setDonateMessage}
          />
        }
      />
      <Route
        path="remove-cart"
        element={
          <RemoveCart
            inventory={inventory}
            setInventory={setInventory}
          />
        }
      />
      <Route
  path="/pickup-location"
  element={<SelectPickupLocation setCart={setCart} />}
/>

    </Routes>
  );
}

export default DashboardWithCart;
