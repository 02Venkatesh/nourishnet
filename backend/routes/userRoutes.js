// userRoutes.js (or a new file like locationRoutes.js)
const express = require('express');
const router = express.Router();
const pool = require('../db');              // your PostgreSQL pool
const authenticateToken = require('../middleware/authMiddleware'); // your JWT middleware

// ---------------------------
// (A) NEW: GET /api/users/me
//     Returns the current user’s profile (id, role, base_lat, base_lng, base_address, etc.)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Select the columns you care about. Feel free to add other fields (email, name, etc.)
    const query = `
      SELECT id, name, email, role, base_lat, base_lng, base_address
      FROM users
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [userId]);

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------
// (B) Existing: PUT /api/users/me/location
router.put('/me/location', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'recipient') {
      return res.status(403).json({ error: 'Only recipients can update base location' });
    }

    const { address, latitude, longitude } = req.body;
    if (!address || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'Address, latitude, and longitude are required' });
    }

    const updateQuery = `
      UPDATE users
      SET base_lat = $1, base_lng = $2, base_address = $3
      WHERE id = $4
      RETURNING id, base_lat AS lat, base_lng AS lng, base_address AS address;
    `;
    const values = [latitude, longitude, address, userId];
    const { rows } = await pool.query(updateQuery, values);

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      message: 'Base location updated successfully',
      location: rows[0],
    });
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
