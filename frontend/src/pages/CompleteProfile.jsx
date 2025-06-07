import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GoogleMap,
  MarkerF,
  StandaloneSearchBox,
  useJsApiLoader,
} from '@react-google-maps/api';
import '../styles.css'; // optional styling

const defaultCenter = {
  lat: 13.0827,
  lng: 80.2707,
};
const libraries = ['places'];

function CompleteProfile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', role: 'donor' });
  const [token, setToken] = useState(null);
  const [coords, setCoords] = useState(defaultCenter);
  const [address, setAddress] = useState('');
  const searchBoxRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) {
      alert('Invalid access');
      navigate('/');
    }
    setToken(t);
  }, [navigate]);

  useEffect(() => {
    if (form.role !== 'recipient') return;

    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
          setAddress(data.results[0].formatted_address);
        } else {
          setAddress('📍 Address not found');
        }
      } catch (err) {
        console.error('Geocode error:', err);
        setAddress('📍 Address not found');
      }
    };

    fetchAddress();
  }, [coords, form.role]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      lat: form.role === 'recipient' ? coords.lat : null,
      lng: form.role === 'recipient' ? coords.lng : null,
      address: form.role === 'recipient' ? address : null,
    };

    const res = await fetch('http://localhost:5000/api/auth/complete-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user.role === 'recipient') {
        localStorage.setItem('recipientLat', coords.lat);
        localStorage.setItem('recipientLng', coords.lng);
        localStorage.setItem('recipientAddress', address);
        navigate('/dashboard/recipient');
      } else {
        navigate('/dashboard/donor');
      }
    } else {
      alert(data.error || 'Failed to complete profile');
    }
  };

  return (
    <div className="hero-container">
      <div className="right-form">
        <div className="form-card">
          <h2>Complete Your Profile</h2>
          <form onSubmit={handleSubmit}>
            <input
              name="phone"
              placeholder="Phone Number"
              required
              onChange={handleChange}
            />
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="donor">Donor</option>
              <option value="recipient">Recipient</option>
            </select>

            {form.role === 'recipient' && isLoaded && (
              <div className="recipient-location-section">
                <h4>📍 Set Your Base Location</h4>

                <StandaloneSearchBox
                  onLoad={(ref) => (searchBoxRef.current = ref)}
                  onPlacesChanged={() => {
                    const places = searchBoxRef.current.getPlaces();
                    if (places && places[0]) {
                      const loc = places[0].geometry.location;
                      setCoords({ lat: loc.lat(), lng: loc.lng() });
                    }
                  }}
                >
                  <input placeholder="Search your base location..." />
                </StandaloneSearchBox>

                <div style={{ height: '250px', marginTop: '8px' }}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={coords}
                    zoom={16}
                    onLoad={(map) => (mapRef.current = map)}
                    onClick={(e) =>
                      setCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() })
                    }
                  >
                    <MarkerF
                      position={coords}
                      draggable
                      onDragEnd={(e) =>
                        setCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() })
                      }
                    />
                  </GoogleMap>
                </div>

                <p style={{ marginTop: '5px' }}>
                  <strong>📌 {address}</strong>
                </p>
              </div>
            )}

            <button type="submit">Submit</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CompleteProfile;
