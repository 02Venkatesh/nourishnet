// src/pages/PrivateRoute.jsx
import React from 'react'
import { Navigate } from 'react-router-dom'

// A simple JWT‐decode util you can write by hand:
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export default function PrivateRoute({ children, allowedRoles = [] }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/" replace />

  const payload = parseJwt(token)
  if (!payload || !payload.role || !allowedRoles.includes(payload.role)) {
    // block if no role or role not in allowedRoles
    return <Navigate to="/" replace />
  }

  return children
}
