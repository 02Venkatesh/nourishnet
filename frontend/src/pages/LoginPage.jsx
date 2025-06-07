// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  try {
    const res = await fetch("https://nourishnet-backend-wgz2.onrender.com/api/auth/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 400 && data.error === 'User not found') {
        setError('User not found. Please check your email.');
      } else if (res.status === 401 && data.error === 'Invalid password') {
        setError('Incorrect password. Please try again.');
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
      return;
    }

    // Save token + redirect
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.user.role === 'recipient') {
  localStorage.setItem('recipientLat', data.user.base_lat);
  localStorage.setItem('recipientLng', data.user.base_lng);
  localStorage.setItem('recipientAddress', data.user.base_address);
}
    if (data.user.role === 'donor') navigate('/dashboard/donor');
    else if (data.user.role === 'recipient') navigate('/dashboard/recipient');
    else if (data.user.role === 'delivery') navigate('/dashboard/delivery');
    else navigate('/');

  } catch (err) {
    setError('Something went wrong. Please check your network.');
  }
};


  return (
    <div className="hero-container">
      <div className="left-hero beautiful-bg">
        <h1 className="main-title">Welcome Back!</h1>
        <p className="subtitle">Log in to manage donations, deliveries, and impact lives — one meal at a time.</p>
      </div>

      <div className="right-form">
        <div className="form-card slide-up">
          <div className="brand-header">  
    <h1 className="brand-title">NourishNet</h1>
  </div>
          <h2>Login to Your Account</h2>
          {error && <p className="error-text">{error}</p>}
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <button type="submit">Login</button>
            <a href="https://nourishnet-backend-wgz2.onrender.com/api/auth/google">
    <button type="button" className="google-btn">Login with Google</button>
  </a>  
            <p className="login-text">Don't have an account? <a href="/register">Register</a></p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
