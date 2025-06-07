import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecipientDashboard.css'; // reuse the same CSS

// Format "DD/MM/YYYY hh:mm AM/PM"
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;
};

// Format only date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB');
};

const CompletedDonations = () => {
  const [donations, setDonations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCompleted = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('http://localhost:5000/api/donation/completed-donations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setDonations(data);
      } catch (err) {
        console.error('Error fetching completed donations:', err);
      }
    };

    fetchCompleted();
  }, []);
const handleLogout = () => {
    
  localStorage.removeItem('token');
  navigate('/');
};
  return (

    <div className="recipient-dashboard-container">
        <div className="logout-container">
  <button onClick={handleLogout} className="logout-btn">Logout</button>
</div>

      <button
        onClick={() => navigate('/dashboard/recipient')}
        className="back-btn"
      >
        ← Back to Dashboard
      </button>

      <h2>Received Donations</h2>

      {donations.length === 0 ? (
        <p>You have no completed donations yet.</p>
      ) : (
        donations.map((donation, index) => (
          <div className="donation-card" key={donation.donation_id || `completed-${index}`}>
            <div className="donation-header">
              <h3>Donor: {donation.donor_name || 'Anonymous'}</h3>
              <p><strong>Phone:</strong> {donation.donor_phone || 'Not Available'}</p>
              <p><strong>Pickup Location:</strong> {donation.pickup_address}</p>
              <p><strong>Donated at:</strong> {formatDateTime(donation.donated_at)}</p>
              <p><strong>Accepted at:</strong> {formatDateTime(donation.accepted_at)}</p>
              <p><strong>Picked Up at:</strong> {formatDateTime(donation.picked_up_at)}</p>
            </div>

            <div className="item-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
  {donation.items.map((item, idx) => {
    const expiryDate = new Date(item.expiry_date).setHours(0, 0, 0, 0);
    const todayMidnight = new Date().setHours(0, 0, 0, 0);
    const isExpired = expiryDate < todayMidnight;

    return (
      <tr
        key={`${donation.donation_id}-${idx}`}
        className={isExpired ? 'expired-row' : ''}
      >
        <td>{item.item_name}</td>
        <td>{item.type}</td>
        <td>{item.quantity}</td>
        <td>{formatDate(item.expiry_date)}</td>
      </tr>
    );
  })}
</tbody>

              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default CompletedDonations;
