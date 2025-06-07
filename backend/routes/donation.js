// routes/donation.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// POST /api/donation/location
router.post('/location', verifyToken, async (req, res) => {
  const { donation_id, lat, lng, address } = req.body;
  
  if (!donation_id || !lat || !lng || !address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      'UPDATE donations SET pickup_lat = $1, pickup_lng = $2, pickup_address = $3 WHERE id = $4 RETURNING *',
      [lat, lng, address, donation_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.status(200).json({ message: 'Location saved successfully' });
  } catch (err) {
    console.error('Error saving pickup location:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /api/inventory/donate
router.post('/donate', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const donorId = req.user.id;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items to donate' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      'INSERT INTO donations (donor_id, status, donated_at) VALUES ($1, $2, NOW()) RETURNING id',
      [donorId, 'Not Accepted']
    );
    const donationId = result.rows[0].id;
    
    for (let item of items) {
  const { item_id, quantity } = item;

  // Fetch expiry_date and type from inventory
  const inventoryRes = await client.query(
    'SELECT expiry_date, type FROM inventory WHERE id = $1 AND user_id = $2',
    [item_id, donorId]
  );

  if (inventoryRes.rows.length === 0) {
    throw new Error(`Inventory item ${item_id} not found`);
  }

  const { expiry_date, type } = inventoryRes.rows[0];

  // Insert into donation_items
  await client.query(
    'INSERT INTO donation_items (donation_id, item_id, quantity, expiry_date, type) VALUES ($1, $2, $3, $4, $5)',
    [donationId, item_id, quantity, expiry_date, type]
  );

  // Update inventory
  await client.query(
    'UPDATE inventory SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3 AND quantity >= $1',
    [quantity, item_id, donorId]
  );
}


    await client.query('COMMIT');
    res.json({ message: 'Donation recorded successfully', donation_id: donationId });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Donation failed' });
  } finally {
    client.release();
  }
});
// GET /api/inventory/donations
router.get('/donations', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const donorId = req.user.id;

    const donationsRes = await client.query(
      `
      SELECT
        d.id               AS donation_id,
        d.status                   ,
        d.donated_at               ,
        d.accepted_at              ,
        d.picked_up_at             ,  -- ✅ NEW FIELD
        d.accepted_by              ,
        r.name             AS accepted_by_name ,
        r.phone            AS accepted_by_phone,
        di.item_id                 ,
        di.quantity                ,
        di.expiry_date             ,
        di.type                    ,
        inv.item_name
      FROM donations d
      JOIN donation_items di ON d.id = di.donation_id
      JOIN inventory inv    ON di.item_id = inv.id
      LEFT JOIN users r     ON d.accepted_by = r.id
      WHERE d.donor_id = $1
      ORDER BY d.donated_at DESC
      `,
      [donorId]
    );

    const donationMap = {};

    for (let row of donationsRes.rows) {
      const {
        donation_id,
        status,
        donated_at,
        accepted_at,
        picked_up_at,           // ✅ Extract here
        accepted_by,
        accepted_by_name,
        accepted_by_phone,
        item_id,
        item_name,
        quantity,
        expiry_date,
        type,
      } = row;

      if (!donationMap[donation_id]) {
        donationMap[donation_id] = {
          donation_id,
          status,
          donated_at,
          accepted_at,
          picked_up_at,         // ✅ Add to response
          accepted_by,
          accepted_by_name,
          accepted_by_phone,
          items: [],
        };
      }

      donationMap[donation_id].items.push({
        item_id,
        item_name,
        quantity,
        expiry_date,
        type,
      });
    }

    res.json(Object.values(donationMap));
  } catch (err) {
    console.error('Error fetching donations:', err);
    res.status(500).json({ error: 'Failed to fetch donations' });
  } finally {
    client.release();
  }
});



// DELETE /api/inventory/donations/:donationId
router.delete('/donations/:donationId', verifyToken, async (req, res) => {
  const { donationId } = req.params;
  const donorId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check status and lock state
    const donationCheck = await client.query(
      'SELECT status, is_locked FROM donations WHERE id = $1 AND donor_id = $2',
      [donationId, donorId]
    );

    if (donationCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const { status, is_locked } = donationCheck.rows[0];

    if (is_locked) {
      return res.status(423).json({ error: 'This donation is currently being processed by an NGO and cannot be removed.' });
    }

    if (status !== 'Not Accepted') {
      return res.status(400).json({ error: 'Cannot delete accepted donations' });
    }

    // Restore inventory
    const donationItems = await client.query(
      'SELECT item_id, quantity FROM donation_items WHERE donation_id = $1',
      [donationId]
    );

    for (let row of donationItems.rows) {
      await client.query(
        'UPDATE inventory SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3',
        [row.quantity, row.item_id, donorId]
      );
    }

    // Delete donation and items
    await client.query('DELETE FROM donation_items WHERE donation_id = $1', [donationId]);
    await client.query('DELETE FROM donations WHERE id = $1', [donationId]);

    await client.query('COMMIT');
    res.json({ message: 'Donation removed and inventory restored' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to remove donation' });
  } finally {
    client.release();
  }
});

// PATCH /api/donation/:id/status
router.patch('/:id/status', verifyToken, async (req, res) => {
  const { status } = req.body;
  const donationId = req.params.id;
  const userRole = req.user.role;
  const ngoId = req.user.id; // the ID of the currently logged-in NGO

  if (!['Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can update donation status' });
  }

  if (status === 'Accepted') {
    // ✅ Accept logic (with transaction and row lock)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 🔐 Lock the row for safe concurrency
      const check = await client.query(
        'SELECT status FROM donations WHERE id = $1 FOR UPDATE',
        [donationId]
      );

      const currentStatus = check.rows[0]?.status;
      if (!currentStatus) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Donation not found' });
      }

      if (currentStatus !== 'Not Accepted') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Donation already accepted by another recipient' });
      }

      const result = await client.query(
        'UPDATE donations SET status = $1, accepted_by = $2 WHERE id = $3 RETURNING *',
        ['Accepted', ngoId, donationId]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Donation accepted', donation: result.rows[0] });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error accepting donation:', err);
      res.status(500).json({ error: 'Failed to accept donation' });
    } finally {
      client.release();
    }
  }

  if (status === 'Rejected') {
  const recipientId = parseInt(req.user.id, 10);

  if (isNaN(recipientId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    await pool.query(
      `
      UPDATE donations 
      SET rejected_by_ngo_ids = 
        CASE 
          WHEN rejected_by_ngo_ids IS NULL THEN ARRAY[$1::INTEGER] 
          ELSE array_append(rejected_by_ngo_ids, $1::INTEGER) 
        END 
      WHERE id = $2
      `,
      [recipientId, donationId]
    );

    return res.json({ message: 'Donation rejected' });

  } catch (err) {
    console.error('🔥 Error rejecting donation:', err.stack);
    return res.status(500).json({ error: 'Failed to reject donation' });
  }
}

});


// GET /api/donation/available
router.get('/available', verifyToken, async (req, res) => {
  const userRole = req.user.role;
  const ngoId = req.user.userId;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only NGOs can view available donations' });
  }

  try {
    const result = await pool.query(
      `
      SELECT * FROM donations 
      WHERE status = 'Not Accepted' 
      AND NOT ($1 = ANY(rejected_by_ngo_ids))
      ORDER BY created_at DESC
      `,
      [ngoId]
    );
    

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching available donations:', err);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});
router.get('/unaccepted', verifyToken, async (req, res) => {
  const ngoId = req.user.id;
  const userRole = req.user.role;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this route' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        d.id AS donation_id,
        d.donor_id,
        d.status,
        d.donated_at,
        d.pickup_address,
        d.pickup_lat,
        d.pickup_lng,
        u.name AS donor_name,
        u.phone AS donor_phone,
        di.item_id,
        di.quantity,
        di.expiry_date,
        di.type,
        inv.item_name
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      JOIN donation_items di ON d.id = di.donation_id
      JOIN inventory inv ON di.item_id = inv.id
      WHERE d.status = 'Not Accepted'
        AND NOT ($1 = ANY(d.rejected_by_ngo_ids))
      ORDER BY d.donated_at DESC
    `, [ngoId]);

    // Group donation items under each donation
    const donationMap = {};
    for (const row of result.rows) {
      const {
        donation_id, donor_name, donor_phone,
        pickup_address, pickup_lat, pickup_lng,
        donated_at, status,
        item_id, item_name, quantity, expiry_date, type
      } = row;

      if (!donationMap[donation_id]) {
        donationMap[donation_id] = {
          donation_id,
          donor_name,
          donor_phone,
          pickup_address,
          pickup_lat,
          pickup_lng,
          donated_at,
          status,
          items: []
        };
      }

      donationMap[donation_id].items.push({
        item_id,
        item_name,
        quantity,
        expiry_date,
        type
      });
    }

    res.json(Object.values(donationMap));
  } catch (err) {
    console.error('Error fetching unaccepted donations:', err);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// GET /api/donation/accepted-by-me
router.get('/accepted-by-me', verifyToken, async (req, res) => {
  const userRole = req.user.role;
  const recipientId = req.user.id;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        d.id            AS donation_id,
        d.status,
        d.donated_at,
        d.accepted_at,           -- include this
        d.pickup_address,
        u.name         AS donor_name,
        u.phone        AS donor_phone,
        di.item_id,
        di.quantity,
        di.expiry_date,
        di.type,
        inv.item_name
      FROM donations d
      JOIN users u            ON d.donor_id = u.id
      JOIN donation_items di  ON d.id = di.donation_id
      JOIN inventory inv      ON di.item_id = inv.id
      WHERE d.status = 'Accepted'
        AND d.accepted_by = $1
      ORDER BY d.donated_at DESC
    `, [recipientId]);

    const donationMap = {};

    for (const row of result.rows) {
      const {
        donation_id,
        status,
        donated_at,
        accepted_at,      // pull this out
        pickup_address,
        donor_name,
        donor_phone,
        item_id,
        item_name,
        quantity,
        expiry_date,
        type
      } = row;

      if (!donationMap[donation_id]) {
        donationMap[donation_id] = {
          donation_id,
          status,
          donated_at,
          accepted_at,    // include here
          pickup_address,
          donor_name,
          donor_phone,
          items: []
        };
      }

      donationMap[donation_id].items.push({
        item_id,
        item_name,
        quantity,
        expiry_date,
        type
      });
    }

    res.json(Object.values(donationMap));
  } catch (err) {
    console.error('Error fetching accepted donations:', err);
    res.status(500).json({ error: 'Failed to fetch accepted donations' });
  }
});


// 🔒 Lock Donation
router.post('/:id/lock', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const recipientId = req.user.id;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this' });
  } 
  try {
    const result = await pool.query(
      'SELECT is_locked, locked_at, status FROM donations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Donation no longer exists. It may have been removed by the donor.' });
    }

    const { is_locked, locked_at, status } = result.rows[0];

    if (status !== 'Not Accepted') {
      return res.status(410).json({ error: 'This donation has already been accepted.' });
    }

    if (is_locked) {
      const lockedTime = new Date(locked_at);
      const now = new Date();
      const diffMins = (now - lockedTime) / (1000 * 60);

      if (diffMins < 10) {
        return res.status(409).json({ error: 'Donation is currently locked by someone else.' });
      }
    }

    await pool.query(
      `UPDATE donations
       SET is_locked = true, locked_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Donation locked successfully' });
  } catch (err) {
    console.error('Error locking donation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// 🔓 Unlock Donation
router.patch('/:id/unlock', verifyToken, async (req, res) => {
  const { id } = req.params;
  const userRole = req.user.role;
  const recipientId = req.user.id;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this' });
  }
  try {
    await pool.query(
      `UPDATE donations
       SET is_locked = false, locked_at = NULL
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Donation unlocked' });
  } catch (err) {
    console.error('Error unlocking donation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/accept-partial', verifyToken, async (req, res) => {
  const { donationId, items } = req.body;
  const recipientId = req.user.id;
  const userRole = req.user.role;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this' });
  }

  try {
    const donationRes = await pool.query(
      `SELECT donor_id, pickup_lat, pickup_lng, pickup_address, donated_at 
       FROM donations WHERE id = $1`,
      [donationId]
    );

    if (donationRes.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const { donor_id, pickup_lat, pickup_lng, pickup_address, donated_at } = donationRes.rows[0];
    const acceptedItems = items.filter(i => i.acceptedQuantity > 0);
    const hasRemaining = items.some(i => i.acceptedQuantity < i.availableQuantity);

    let newAcceptedDonationId = null;

    // Step 1: Create new donation for accepted items
    if (acceptedItems.length > 0) {
      const newDonation = await pool.query(
        `INSERT INTO donations (
          donor_id, status, pickup_lat, pickup_lng, pickup_address, accepted_by, is_locked, donated_at
        ) VALUES ($1, 'Accepted', $2, $3, $4, $5, false, $6)
        RETURNING id`,
        [donor_id, pickup_lat, pickup_lng, pickup_address, recipientId, donated_at]
      );
      newAcceptedDonationId = newDonation.rows[0].id;

      await pool.query(
        `UPDATE donations SET accepted_at = NOW() WHERE id = $1`,
        [newAcceptedDonationId]
      );

      for (const item of acceptedItems) {
        await pool.query(
          `INSERT INTO donation_items (
            donation_id, item_id, quantity, type, expiry_date
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            newAcceptedDonationId,
            item.item_id,
            item.acceptedQuantity,
            item.type,
            item.expiry,
          ]
        );
      }
    }

    // Step 2: Delete original items and reinsert remaining quantities
    await pool.query(`DELETE FROM donation_items WHERE donation_id = $1`, [donationId]);

    for (const item of items) {
      const remainingQty = item.availableQuantity - item.acceptedQuantity;
      if (remainingQty > 0) {
        await pool.query(
          `INSERT INTO donation_items (
            donation_id, item_id, quantity, type, expiry_date
          ) VALUES ($1, $2, $3, $4, $5)`,
          [donationId, item.item_id, remainingQty, item.type, item.expiry]
        );
      }
    }

    // Step 3: Final cleanup
    const countCheck = await pool.query(
      'SELECT COUNT(*) FROM donation_items WHERE donation_id = $1',
      [donationId]
    );

    if (parseInt(countCheck.rows[0].count) === 0) {
      await pool.query(`DELETE FROM donations WHERE id = $1`, [donationId]);
    } else {
      await pool.query(
        `UPDATE donations SET is_locked = false, locked_at = NULL WHERE id = $1`,
        [donationId]
      );

      // Also ensure the recipient can still see it again
      await pool.query(
        `UPDATE donations SET rejected_by_ngo_ids = array_remove(rejected_by_ngo_ids, $1) WHERE id = $2`,
        [recipientId, donationId]
      );
    }

    res.json({ message: 'Partial donation accepted successfully' });
  } catch (err) {
    console.error('Partial accept error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// PATCH /api/donation/:id/revoke
router.patch('/:id/revoke', verifyToken, async (req, res) => {
  const { id } = req.params;
 
  const userRole = req.user.role;
  const recipientId = req.user.id;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this' });
  }
  try {
    const check = await pool.query(
      'SELECT accepted_by, status FROM donations WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    const { accepted_by, status } = check.rows[0];

    if (status !== 'Accepted' || accepted_by !== recipientId) {
      return res.status(400).json({ error: 'You cannot revoke this donation' });
    }

    await pool.query(
      `UPDATE donations
       SET status = 'Not Accepted',
           accepted_by = NULL,
           is_locked = false,
           locked_at = NULL
       WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Acceptance revoked' });
  } catch (err) {
    console.error("Error revoking acceptance:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/donation/:id/mark-completed
router.patch('/:id/mark-completed', verifyToken, async (req, res) => {
  const client = await pool.connect();
  const donationId = req.params.id;
  const receiverId = req.user.id;
  const userRole = req.user.role;
  const recipientId = req.user.id;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this' });
  }
  try {
    // Verify if this user accepted the donation
    const check = await client.query(
      'SELECT * FROM donations WHERE id = $1 AND accepted_by = $2 AND status = $3',
      [donationId, receiverId, 'Accepted']
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized or donation not accepted by you.' });
    }

    // Mark as completed and store pickup timestamp
    await client.query(
      `UPDATE donations
       SET status = 'Completed', picked_up_at = NOW()
       WHERE id = $1`,
      [donationId]
    );

    res.json({ success: true, message: 'Donation marked as completed.' });
  } catch (err) {
    console.error('Error updating donation:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/donation/completed-donations
router.get('/completed-donations', verifyToken, async (req, res) => {
  const userRole = req.user.role;
  const recipientId = req.user.id;

  if (userRole !== 'recipient') {
    return res.status(403).json({ error: 'Only recipients can access this' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        d.id            AS donation_id,
        d.status,
        d.donated_at,
        d.accepted_at,
        d.picked_up_at,
        d.pickup_address,
        u.name          AS donor_name,
        u.phone         AS donor_phone,
        di.item_id,
        di.quantity,
        di.expiry_date,
        di.type,
        inv.item_name
      FROM donations d
      JOIN users u            ON d.donor_id = u.id
      JOIN donation_items di  ON d.id = di.donation_id
      JOIN inventory inv      ON di.item_id = inv.id
      WHERE d.status = 'Completed'
        AND d.accepted_by = $1
      ORDER BY d.picked_up_at DESC
    `, [recipientId]);

    const donationMap = {};

    for (const row of result.rows) {
      const {
        donation_id,
        status,
        donated_at,
        accepted_at,
        picked_up_at,
        pickup_address,
        donor_name,
        donor_phone,
        item_id,
        item_name,
        quantity,
        expiry_date,
        type
      } = row;

      if (!donationMap[donation_id]) {
        donationMap[donation_id] = {
          donation_id,
          status,
          donated_at,
          accepted_at,
          picked_up_at,
          pickup_address,
          donor_name,
          donor_phone,
          items: []
        };
      }

      donationMap[donation_id].items.push({
        item_id,
        item_name,
        quantity,
        expiry_date,
        type
      });
    }

    res.json(Object.values(donationMap));
  } catch (err) {
    console.error('Error fetching completed donations:', err);
    res.status(500).json({ error: 'Failed to fetch completed donations' });
  }
});


module.exports = router;
