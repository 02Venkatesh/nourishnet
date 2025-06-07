const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('./passportSetup');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const donationRoutes = require('./routes/donation'); 
const userRoutes = require('./routes/userRoutes'); 
const session = require('express-session');

app.use(session({
  secret: 'session_secret',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/users', userRoutes);
// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/donation', donationRoutes); // ✅ Route mounted on correct base



// Test root
app.get('/', (req, res) => res.send('NourishNet backend running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
