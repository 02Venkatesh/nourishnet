import React, { useState, useEffect, useRef } from 'react';
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

const testimonials = [
  {
    quote: "A life-changing solution for food surplus. Our school now donates weekly with ease.",
    author: "Ananya Rao, Headmistress",
  },
  {
    quote: "NourishNet helped our restaurant cut food waste by 30%. Brilliant impact!",
    author: "Rahul Menon, Restaurant Owner",
  },
  {
    quote: "Simple, scalable, and socially impactful. NGOs like ours rely on it daily.",
    author: "Sita Kulkarni, NGO Coordinator",
  },
  {
    quote: "This is the tech food sustainability always needed. Love it!",
    author: "Jayant Kapoor, FoodTech Analyst",
  },
];

function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'donor',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [coords, setCoords] = useState(defaultCenter);
  const [address, setAddress] = useState('');
  const searchBoxRef = useRef(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) alert('✅ Registered successfully!');
    else alert(data.error || '❌ Registration failed');
  };

  return (
    <div className="hero-container">
      <div className="left-hero beautiful-bg">
        <h1 className="main-title">Feed Hope, Not Landfills</h1>
        <p className="subtitle">
          NourishNet empowers organizations to track, manage, and donate food — seamlessly reducing waste and nourishing communities.
        </p>
        <div className="testimonials fade-in">
          <blockquote>“{testimonials[currentTestimonial].quote}”</blockquote>
          <span>- {testimonials[currentTestimonial].author}</span>
        </div>
      </div>

      <div className="right-form">
        <div className="form-card slide-up">
          <div className="brand-header">  
    <h1 className="brand-title">NourishNet</h1>
  </div>
          <h2>Create an Account</h2>

          <div className="role-toggle">
            <button
              className={form.role === 'donor' ? 'active' : ''}
              onClick={() => setForm({ ...form, role: 'donor' })}
            >
              Donor
            </button>
            <button
              className={form.role === 'recipient' ? 'active' : ''}
              onClick={() => setForm({ ...form, role: 'recipient' })}
            >
              Recipient
            </button>
            
          </div>

          <form onSubmit={handleSubmit}>
            <input name="name" placeholder="Full Name" onChange={handleChange} required />
            <input name="email" placeholder="Email Address" onChange={handleChange} required />
            <input name="phone" placeholder="Phone Number" onChange={handleChange} required />

            <div className="input-group">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                onChange={handleChange}
                required
              />
              <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>

            {form.role === 'recipient' && isLoaded && (
              <div className="recipient-location-section">
                <h4>📍 Set Your Location</h4>

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
                  <input placeholder="Search for your location..." />
                </StandaloneSearchBox>

                <div style={{ height: '250px', marginTop: '8px' }}>
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={coords}
                    zoom={16}
                    onLoad={(map) => (mapRef.current = map)}
                    onClick={(e) => setCoords({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
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

                <p style={{ marginTop: '5px' }}><strong>📌 {address}</strong></p>
              </div>
            )}

            <button type="submit">Create Account</button>
            <p className="login-text">
              Already have an account? <a href="/">Login</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
