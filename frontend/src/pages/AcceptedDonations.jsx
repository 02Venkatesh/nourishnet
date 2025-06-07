// AcceptedDonations.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RecipientDashboard.css'; // reuse your existing styles

// Helper to format "DD/MM/YYYY hh:mm AM/PM"
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString('en-GB')} ${date.toLocaleTimeString(
    'en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
  )}`;
};

// Just format date part (no time)
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB');
};

const AcceptedDonations = () => {
  const [donations, setDonations] = useState([]);
  // "now" will update every minute so that the UI can hide the button after 10 min
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();

  // 1) Fetch accepted donations and sort by accepted_at descending
  useEffect(() => {
    const fetchAccepted = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          'http://localhost:5000/api/donation/accepted-by-me',
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();

        // Sort by accepted_at descending (newest first)
        const sorted = [...data].sort((a, b) => {
          return new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime();
        });

        setDonations(sorted);
      } catch (err) {
        console.error('Error fetching accepted donations:', err);
      }
    };

    fetchAccepted();
  }, []);

  // 2) Update "now" every minute so we can re-render and hide revoke buttons after 10 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000); // every 60 seconds

    return () => clearInterval(intervalId);
  }, []);

  // 3) Handle revoke acceptance
  const handleRevokeAcceptance = async (donationId) => {
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:5000/api/donation/${donationId}/revoke`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Failed to revoke acceptance.');
        return;
      }

      // Remove from UI immediately
      setDonations((prev) =>
        prev.filter((d) => d.donation_id !== donationId)
      );
    } catch (err) {
      console.error('Error revoking acceptance:', err);
      alert('Something went wrong.');
    }
  };
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

      <h2>My Accepted Donations</h2>

      {donations.length === 0 ? (
        <p>You haven’t accepted any donations yet.</p>
      ) : (
        donations.map((donation, index) => {
          // Compute whether we are still within 10 minutes of accepted_at
          const acceptedTs = new Date(donation.accepted_at).getTime();
          const elapsed = now - acceptedTs;
          const withinTenMin = elapsed <= 10 * 60 * 1000; // 10 minutes in ms

          return (
            <div
              className="donation-card"
              key={donation.donation_id || `donation-${index}`}
            >
              <div className="donation-header">
                <h3>Donor: {donation.donor_name || 'Anonymous'}</h3>
                <p>
                  <strong>Phone:</strong> {donation.donor_phone || 'Not Available'}
                </p>
                <p>
                  <strong>Pickup Location:</strong> {donation.pickup_address}
                </p>
                <p>
                  <strong>Donated at:</strong> {formatDateTime(donation.donated_at)}
                </p>
                <p>
                  <strong>Accepted at:</strong> {formatDateTime(donation.accepted_at)}
                </p>
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

              {withinTenMin && (
                <button
                  className="revoke-btn"
                  onClick={() => handleRevokeAcceptance(donation.donation_id)}
                >
                  Revoke Acceptance
                </button>
              )}
              <button
  className="pickup-btn"
  onClick={async () => {
 
    

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:5000/api/donation/${donation.donation_id}/mark-completed`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Error marking as completed.");
        return;
      }

      setDonations((prev) =>
        prev.filter((d) => d.donation_id !== donation.donation_id)
      );
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  }}    
>
  Mark as Picked Up
</button>

            </div>
          );
        })
      )}
    </div>
  );
};

export default AcceptedDonations;
