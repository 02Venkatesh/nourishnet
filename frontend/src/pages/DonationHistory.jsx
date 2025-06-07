  import React, { useEffect, useState } from 'react';
  import axios from 'axios';
  import './DonationHistory.css';
  import { useNavigate } from 'react-router-dom';

  function formatDateTimeWithAMPM(isoDateString) {
    const d = new Date(isoDateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = String(hours).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm} ${ampm}`;
  }

  function DonationHistory() {
    const [donations, setDonations] = useState([]);
    const [filter, setFilter] = useState('All');
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const fetchDonations = async () => {
      try {
        const res = await axios.get('https://nourishnet-backend-wgz2.onrender.com/api/donation/donations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDonations(res.data);
      } catch (err) {
        console.error('Failed to load donations', err);
      }
    };

    useEffect(() => {
      fetchDonations();
    }, [token]);

    const handleLogout = () => {
      localStorage.removeItem('token');
      navigate('/');
    };

    const handleRemoveDonation = async (donationId) => {
      const confirmed = window.confirm("Are you sure you want to remove this donation?");
      if (!confirmed) return;

      try {
        await axios.delete(`https://nourishnet-backend-wgz2.onrender.com/api/donation/donations/${donationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Donation removed and inventory restored!");
        fetchDonations();
      } catch (err) {
        console.error(err);
        if (err.response?.status === 423) {
          alert("This donation is currently being processed by an NGO and cannot be removed.");
        } else if (err.response?.status === 400) {
          alert("Accepted donations cannot be removed.");
          fetchDonations();
        } else {
          alert("Failed to remove donation.");
        }
      }
    };

    const notAccepted = donations
      .filter((d) => d.status === 'Not Accepted')
      .sort((a, b) => new Date(b.donated_at) - new Date(a.donated_at));

    const accepted = donations
      .filter((d) => d.status === 'Accepted')
      .sort((a, b) => new Date(b.accepted_at) - new Date(a.accepted_at));

    const completed = donations
      .filter((d) => d.status === 'Completed')
      .sort((a, b) => new Date(b.picked_up_at) - new Date(a.picked_up_at));

    const filteredDonations = (() => {
      if (filter === 'Not Accepted') return notAccepted;
      if (filter === 'Accepted') return accepted;
      if (filter === 'Completed') return completed;
      return []; // not used when filter is 'All'
    })();

    const renderDonationCard = (donation) => (
      <div key={donation.donation_id} className="donation-card">
        <h4>Donation ID: {donation.donation_id}</h4>
        <p className={`status-tag ${donation.status === 'Accepted' ? 'accepted' : donation.status === 'Completed' ? 'completed' : 'not-accepted'}`}>
          Status: <strong>{donation.status}</strong>
        </p>
        <p><strong>Donated at:</strong> {formatDateTimeWithAMPM(donation.donated_at)}</p>

        {donation.status === 'Accepted' && (
          <>
            <p><strong>Accepted at:</strong> {formatDateTimeWithAMPM(donation.accepted_at)}</p>
            <p><strong>Receiver details:</strong></p>
            <p><strong>Name:</strong> {donation.accepted_by_name}</p>
            <p><strong>Phone Number:</strong> {donation.accepted_by_phone}</p>
          </>
        )}

        {donation.status === 'Completed' && donation.picked_up_at && (
          <>
            <p><strong>Accepted at:</strong> {formatDateTimeWithAMPM(donation.accepted_at)}</p>
            <p><strong>Picked Up at:</strong> {formatDateTimeWithAMPM(donation.picked_up_at)}</p>
            <p><strong>Receiver details:</strong></p>
            <p><strong>Name:</strong> {donation.accepted_by_name}</p>
            <p><strong>Phone Number:</strong> {donation.accepted_by_phone}</p>
          </>
        )}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {donation.items.map((item, index) => {
  const expiry = new Date(item.expiry_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired = expiry < today;

  const formattedExpiry = `${String(expiry.getDate()).padStart(2, '0')}/${String(expiry.getMonth() + 1).padStart(2, '0')}/${expiry.getFullYear()}`;

  return (
    <tr key={index} className={isExpired ? 'expired-row' : ''}>
      <td>{item.item_name}</td>
      <td>{item.type}</td>
      <td>{item.quantity}</td>
      <td>{formattedExpiry}</td>
    </tr>
  );
})}


            </tbody>
          </table>
        </div>

        {donation.status === 'Not Accepted' && (
          <button className="remove-btn" onClick={() => handleRemoveDonation(donation.donation_id)}>
            Remove Donation
          </button>
        )}
      </div>
    );

    return (
      <div className="donation-history">
        <div className="top-bar">
          <button className="back-btn" onClick={() => navigate('/dashboard/donor')}>
            ← Back to Inventory
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

        <h2>Your Donations</h2>

        <div className="filter-controls">
          <label>Filter by Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="All">All</option>
            <option value="Not Accepted">Not Accepted</option>
            <option value="Accepted">Accepted</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {filter !== 'All' ? (
          filteredDonations.length === 0 ? (
            <p className="no-donations">No donations to display.</p>
          ) : (
            filteredDonations.map(renderDonationCard)
          )
        ) : (
          <>
            {notAccepted.length === 0 &&
            accepted.length === 0 &&
            completed.length === 0 ? (
              <p className="no-donations">No donations to display.</p>
            ) : (
              <>
                {notAccepted.length > 0 && (
                  <>
                    <h3 className="section-heading">Not Accepted</h3>
                    {notAccepted.map(renderDonationCard)}
                  </>
                )}
                {accepted.length > 0 && (
                  <>
                    <h3 className="section-heading">Accepted</h3>
                    {accepted.map(renderDonationCard)}
                  </>
                )}
                {completed.length > 0 && (
                  <>
                    <h3 className="section-heading">Completed</h3>
                    {completed.map(renderDonationCard)}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    );
  }

  export default DonationHistory;
