// AcceptPartialModal.jsx
import React, { useState, useEffect } from 'react';
import './AcceptPartialModal.css';

const AcceptPartialModal = ({ donation, onClose, onSubmit }) => {
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    // Pre-fill quantities with each item’s full available quantity
    if (donation?.items) {
      const initial = {};
      donation.items.forEach((item) => {
        const key = item.id || item.item_id;
        initial[key] = item.quantity;
      });
      setQuantities(initial);
    }
  }, [donation]);

  const handleChange = (itemId, value) => {
    const maxQty =
      donation.items.find((i) => (i.id || i.item_id) === itemId)?.quantity || 0;
    const val = Math.min(Math.max(0, parseInt(value) || 0), maxQty);
    setQuantities((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleSubmit = () => {
    const finalItems = donation.items.map((item) => {
      const key = item.id || item.item_id;
      return {
        item_id: key,
        item_name: item.item_name,
        type: item.type,
        expiry: item.expiry_date,
        availableQuantity: item.quantity,
        acceptedQuantity: quantities[key] || 0,
      };
    });
    onSubmit(donation.donation_id, finalItems);
  };

  if (!donation) return null;

  // Today's midnight for expiry comparison
  const todayMidnight = new Date().setHours(0, 0, 0, 0);

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Select Items to Accept</h2>

        <table className="modal-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Expiry</th>
              <th>Available</th>
              <th>Accept</th>
            </tr>
          </thead>
          <tbody>
            {donation.items.map((item) => {
              const key = item.id || item.item_id;
              const expiryDate = new Date(item.expiry_date).setHours(0, 0, 0, 0);
              const isExpired = expiryDate < todayMidnight;

              return (
                <tr
                  key={key}
                  className={isExpired ? 'expired-row' : ''}
                >
                  <td>{item.item_name}</td>
                  <td>{item.type}</td>
                  <td>{new Date(item.expiry_date).toLocaleDateString('en-GB')}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={quantities[key] ?? ''}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="modal-actions">
          <button className="confirm-btn" onClick={handleSubmit}>
            Confirm
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptPartialModal;
