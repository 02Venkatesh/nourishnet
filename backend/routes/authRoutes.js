const express = require('express');
const passport = require('passport');
const pool = require('../db');
const bcrypt = require('bcrypt');
const router = express.Router();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const verifyToken = require('../middleware/authMiddleware');

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/me', verifyToken, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id, name, email, phone, role, base_lat, base_lng, base_address FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json(userRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


router.get('/google/callback', passport.authenticate('google', {
  session: false,
  failureRedirect: '/'
}), async (req, res) => {
  const { email, name } = req.user;

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      // ✅ User exists: Log them in
      const user = existingUser.rows[0];

      const token = jwt.sign(
  {
    id: user.id,
    role: user.role,
    base_lat: user.base_lat,
    base_lng: user.base_lng,
    base_address: user.base_address
  },
  process.env.JWT_SECRET,
  { expiresIn: '2h' }
);


      // Redirect with token (you can also store in cookie or localStorage via frontend)
      return res.redirect(`http://localhost:3000/oauth-success?token=${token}`);
    }

    // ❗ User not found – first-time Google user: ask for more info
    const partialUserToken = jwt.sign(
      { email, name },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.redirect(`http://localhost:3000/complete-profile?token=${partialUserToken}`);

  } catch (err) {
    console.error('Google OAuth Callback Error:', err);
    res.redirect('/');
  }
});



// Add this inside your authRoutes.js
router.post('/complete-profile', async (req, res) => {
  const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(400).json({ error: 'Token missing' });
}
const token = authHeader.split(' ')[1];

  const { role, phone, lat, lng, address } = req.body;

  try {
    // Decode the temporary token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;
    const name = decoded.name;

    if (!email || !name || !role || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check again to ensure no duplicate (avoid race conditions)
    const check = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    console.log('Form input:', req.body);

    // Insert into DB
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, role, base_lat, base_lng, base_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role`,
      [
        name,
        email,
        phone,
        role,
        role === 'recipient' ? lat : null,
        role === 'recipient' ? lng : null,
        role === 'recipient' ? address : null
      ]
    );

    // Generate JWT token after full registration
    const finalToken = jwt.sign(
  {
    id: result.rows[0].id,
    role: result.rows[0].role,
    base_lat: result.rows[0].base_lat,
    base_lng: result.rows[0].base_lng,
    base_address: result.rows[0].base_address
  },
  process.env.JWT_SECRET,
  { expiresIn: '2h' }
);


    res.json({
      message: 'Profile completed',
      token: finalToken,
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Complete profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});




router.get('/protected', verifyToken, (req, res) => {
  res.json({
    message: '✅ You are authorized!',
    user: req.user
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phone, password, role, lat, lng, address } = req.body;

  try {
    // Check if user already exists
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert with optional lat/lng/address for Recipients
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password, role, base_lat, base_lng, base_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role`,
      [
        name,
        email,
        phone,
        hashedPassword,
        role,
        role === 'recipient' ? lat : null,
        role === 'recipient' ? lng : null,
        role === 'recipient' ? address : null
      ]
    );

    res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
  } catch (err) {
    console.error("Register Error:", err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Respond with token and user info
    res.json({
  message: 'Login successful',
  token,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    base_lat: user.base_lat,
    base_lng: user.base_lng,
    base_address: user.base_address
  }
});


  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
