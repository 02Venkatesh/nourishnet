// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DonorDashboard from './pages/DonorDashboard';
import DashboardWithCart from './pages/DashboardWithCart';
import DonationHistory from './pages/DonationHistory';
import RemoveCart from './pages/RemoveCart';
import SelectPickupLocation from './pages/SelectPickupLocation';
import AcceptedDonations from './pages/AcceptedDonations';
import RecipientDashboard from './pages/RecipientDashboard';
import CompleteProfile from './pages/CompleteProfile';
import OAuthSuccess from './pages/OAuthSuccess';
import CompletedDonations from './pages/CompletedDonations';
import './styles.css';
import { RemoveCartProvider } from './context/RemoveCartContext'; // ✅ Make sure path is correct
import PrivateRoute from './pages/PrivateRoute'
function App() {
  return (
    <Router>
      <RemoveCartProvider>
        <Routes>
          {/* public */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/oauth-success" element={<OAuthSuccess />} />

          {/* donor-only */}
          <Route
            path="/dashboard/donor/*"
            element={
              <PrivateRoute allowedRoles={['donor']}>
                <DashboardWithCart />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/donor/donations"
            element={
              <PrivateRoute allowedRoles={['donor']}>
                <DonationHistory />
              </PrivateRoute>
            }
          />

          {/* recipient-only */}
          <Route
            path="/dashboard/recipient"
            element={
              <PrivateRoute allowedRoles={['recipient']}>
                <RecipientDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/recipient/accepted"
            element={
              <PrivateRoute allowedRoles={['recipient']}>
                <AcceptedDonations />
              </PrivateRoute>
            }
          />
          <Route
            path="/dashboard/recipient/completed"
            element={
              <PrivateRoute allowedRoles={['recipient']}>
                <CompletedDonations />
              </PrivateRoute>
            }
          />
        </Routes>
      </RemoveCartProvider>
    </Router>
  )
}

export default App
