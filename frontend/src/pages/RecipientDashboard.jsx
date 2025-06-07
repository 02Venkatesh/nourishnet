import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapModal from './MapModal';
import AcceptPartialModal from './AcceptPartialModal';
import UpdateBaseLocation from './UpdateBaseLocation';
import './RecipientDashboard.css';
import { getDistance } from 'geolib';

const RecipientDashboard = () => {
  const [donations, setDonations] = useState([]);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [distanceFilter, setDistanceFilter] = useState(null);
  const [showPartialAcceptModal, setShowPartialAcceptModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const navigate = useNavigate();

  const [recipientLat, setRecipientLat] = useState(
    parseFloat(localStorage.getItem('recipientLat')) || null
  );
  const [recipientLng, setRecipientLng] = useState(
    parseFloat(localStorage.getItem('recipientLng')) || null
  );
  const [recipientAddress, setRecipientAddress] = useState(
    localStorage.getItem('recipientAddress') || ''
  );

  const fetchDonations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://nourishnet-backend-wgz2.onrender.com/api/donation/unaccepted', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Sort by donated_at descending so newest appear first
      const sorted = [...data].sort((a, b) => {
        return new Date(b.donated_at).getTime() - new Date(a.donated_at).getTime();
      });

      setDonations(sorted);
    } catch (err) {
      console.error('Error fetching donations:', err);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

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

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const handleViewMap = (donation) => {
    setSelectedDonation(donation);
    setShowMapModal(true);
  };

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://nourishnet-backend-wgz2.onrender.com/api/donation/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'Rejected' }),
      });

      if (res.ok) {
        setDonations((prev) => prev.filter((d) => d.donation_id !== id));
      }
    } catch (err) {
      console.error('Reject failed', err);
    }
  };

  const handleStartAccept = async (donation) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `https://nourishnet-backend-wgz2.onrender.com/api/donation/${donation.donation_id}/lock`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          alert('Someone else is currently accepting this donation. Please try again later.');
        } else if (res.status === 410 || res.status === 404) {
          alert('This donation has already been accepted or removed.');
          fetchDonations(); 
        } else {
          alert(data.error || 'Something went wrong. Please try again.');
        }
        return;
      }

      setSelectedDonation(donation);
      setShowPartialAcceptModal(true);
    } catch (err) {
      console.error('Error locking donation:', err);
      alert('Error communicating with server. Please try again later.');
    }
  };

  const handleCancelModal = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(
        `https://nourishnet-backend-wgz2.onrender.com/api/donation/${selectedDonation.donation_id}/unlock`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.error('Unlock failed:', err);
    } finally {
      setShowPartialAcceptModal(false);
      setSelectedDonation(null);
    }
  };

  const handlePartialAccept = async (donationId, items) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://nourishnet-backend-wgz2.onrender.com/api/donation/accept-partial`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ donationId, items }),
      });

      if (res.ok) {
        setShowPartialAcceptModal(false);
        setSelectedDonation(null);
        fetchDonations();
      } else {
        alert('Failed to accept donation.');
      }
    } catch (err) {
      console.error('Partial accept failed:', err);
    }
  };
const handleLogout = () => {
  localStorage.removeItem('token');
  navigate('/'); 
};
  const filteredDonations = distanceFilter
    ? donations.filter((donation) => {
        if (recipientLat == null || recipientLng == null) return false;
        const distance = getDistance(
          { latitude: recipientLat, longitude: recipientLng },
          { latitude: donation.pickup_lat, longitude: donation.pickup_lng }
        );
        return distance <= distanceFilter;
      })
    : donations;

  return (
    <div className="recipient-dashboard-container">
      <div className="logout-container">
  <button onClick={handleLogout} className="logout-btn">Logout</button>
</div>

      <div className="recipient-dashboard-header">
        <div className="base-location-section">
          <span>📍 {recipientAddress || 'No base location set'}</span>
          <button
            className="change-location-btn"
            onClick={() => setShowLocationModal(true)}
          >
            Change Your Location
          </button>
        </div>
      </div>

      <button
        className="accepted-btn"
        onClick={() => navigate('/dashboard/recipient/accepted')}
      >
        View My Accepted Donations
      </button>
      <button
  className="completed-btn"
  onClick={() => navigate('/dashboard/recipient/completed')}
>
  View Received Donations
</button>

      <h2>Available Donations</h2>

      <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <label>Filter by distance: </label>
        <select
          value={distanceFilter || ''}
          onChange={(e) => {
            const value = e.target.value;
            setDistanceFilter(value ? parseInt(value, 10) : null);
          }}
        >
          <option value="">Show all</option>
          <option value="1000">Within 1 km</option>
          <option value="3000">Within 3 km</option>
          <option value="5000">Within 5 km</option>
          <option value="10000">Within 10 km</option>
        </select>
      </div>

      {filteredDonations.length === 0 ? (
        <p>No pending donations right now.</p>
      ) : (
        filteredDonations.map((donation, index) => (
          <div
            className="donation-card"
            key={donation.donation_id || `donation-${index}`}
          >
            <div className="donation-header">
              <h3>Donor: {donation.donor_name || 'Anonymous'}</h3>
              <p><strong>Phone:</strong> {donation.donor_phone || 'Not Available'}</p>
              <p><strong>Pickup Location:</strong> {donation.pickup_address}</p>
              <p><strong>Donation Time:</strong> {formatDateTime(donation.donated_at)}</p>
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
                    // Determine if the item is expired:
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

            <div className="donation-actions">
              <button
                className="view-map-btn"
                onClick={() => handleViewMap(donation)}
              >
                View Map
              </button>
              <button
                className="accept-btn"
                onClick={() => handleStartAccept(donation)}
              >
                Accept
              </button>
              <button
                className="reject-btn"
                onClick={() => handleReject(donation.donation_id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      {showMapModal && selectedDonation && (
        <MapModal
          donation={selectedDonation}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {showPartialAcceptModal && selectedDonation && (
        <AcceptPartialModal
          donation={selectedDonation}
          onClose={handleCancelModal}
          onSubmit={handlePartialAccept}
        />
      )}

      {showLocationModal && (
        <UpdateBaseLocation
          onClose={() => setShowLocationModal(false)}
          onSaved={({ lat, lng, address }) => {
            setRecipientLat(lat);
            setRecipientLng(lng);
            setRecipientAddress(address);
          }}
        />
      )}
    </div>
  );
};

export default RecipientDashboard;
