const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware.js');



router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM inventory WHERE user_id = $1 AND quantity > 0 ORDER BY expiry_date ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching inventory:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
// POST /api/inventory/remove
router.post('/remove', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items to remove' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const { id, quantity } of items) {
      const invCheck = await client.query(
        'SELECT quantity FROM inventory WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      if (invCheck.rows.length === 0) {
        throw new Error(`Item with ID ${id} not found`);
      }

      const currentQty = invCheck.rows[0].quantity;
      if (quantity > currentQty) {
        throw new Error(`Cannot remove more than available quantity for item ID ${id}`);
      }

      await client.query(
        'UPDATE inventory SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3',
        [quantity, id, userId]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Items removed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to remove items' });
  } finally {
    client.release();
  }
});

// POST /api/inventory/add
router.post('/add', authMiddleware, async (req, res) => {
  const { item_name, expiry_date, quantity, type } = req.body;

  if (!item_name || !expiry_date || !quantity || !type) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO inventory (user_id, item_name, expiry_date, quantity, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, item_name, expiry_date, quantity, type]
    );

    res.status(201).json({ message: 'Product added', product: result.rows[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM inventory WHERE user_id = $1 AND quantity > 0',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;
