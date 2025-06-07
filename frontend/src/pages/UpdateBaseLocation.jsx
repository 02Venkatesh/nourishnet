// UpdateBaseLocation.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  GoogleMap,
  MarkerF,
  StandaloneSearchBox,
  useJsApiLoader,
} from '@react-google-maps/api';
import axios from 'axios';
import './UpdateBaseLocation.css'; // CSS shown below

const libraries = ['places'];
const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 };

function UpdateBaseLocation({ onClose, onSaved }) {
  const [coords, setCoords] = useState(DEFAULT_CENTER);
  const [address, setAddress] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const searchBoxRef = useRef(null);
  const mapRef = useRef(null);

  // 1) Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // 2) On mount, fetch the recipient’s current base location
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('https://nourishnet-backend-wgz2.onrender.com/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { base_lat, base_lng, base_address, role } = res.data;
        if (role !== 'recipient') {
          alert('Only recipients can update base location.');
          onClose();
          return;
        }
        if (base_lat != null && base_lng != null) {
          setCoords({ lat: base_lat, lng: base_lng });
        }
        if (base_address) {
          setAddress(base_address);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [onClose]);

  if (loadError) return <p>Error loading maps</p>;
  if (!isLoaded || loadingProfile) return <p>Loading…</p>;

  // 3) When user selects a place from the search box:
  const onPlacesChanged = () => {
    const places = searchBoxRef.current.getPlaces();
    if (!places || places.length === 0) return;
    const place = places[0];
    if (!place.geometry || !place.geometry.location) return;

    const newPos = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    };
    setCoords(newPos);
    setAddress(place.formatted_address);
    mapRef.current.panTo(newPos);
  };

  // 4) Click on the map: update coords + reverse‐geocode
  const onMapClick = (e) => {
    const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setCoords(newPos);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: newPos }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress('Address not found');
      }
    });
  };

  // 5) When marker is dragged:
  const onMarkerDragEnd = (e) => {
    const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setCoords(newPos);

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: newPos }, (results, status) => {
      if (status === 'OK' && results[0]) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress('Address not found');
      }
    });
  };

  // 6) Save base location:
  const handleSave = async () => {
    if (!address) {
      alert('Please search for or pick a location first.');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        'https://nourishnet-backend-wgz2.onrender.com/api/users/me/location',
        {
          address,
          latitude: coords.lat,
          longitude: coords.lng,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Write to localStorage for filtering later
      localStorage.setItem('recipientLat', coords.lat.toString());
      localStorage.setItem('recipientLng', coords.lng.toString());
      localStorage.setItem('recipientAddress', address);
      onSaved({ lat: coords.lat, lng: coords.lng, address });
      onClose();
    } catch (err) {
      console.error('Error saving location:', err);
      alert('Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ubl-backdrop">
      <div className="ubl-modal">
        <h3>Change Base Location</h3>

        <div className="ubl-search-wrapper">
          <StandaloneSearchBox
            onLoad={(ref) => (searchBoxRef.current = ref)}
            onPlacesChanged={onPlacesChanged}
          >
            <input
              type="text"
              className="ubl-search-input"
              placeholder="Search for your base location…"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </StandaloneSearchBox>
        </div>

        <div className="ubl-map-container">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '300px' }}
            center={coords}
            zoom={14}
            onLoad={(map) => (mapRef.current = map)}
            onClick={onMapClick}
          >
            <MarkerF
              position={coords}
              draggable
              onDragEnd={onMarkerDragEnd}
            />
          </GoogleMap>
        </div>

        <p className="ubl-current-address">📌 {address || 'No address selected'}</p>

        <div className="ubl-buttons">
          <button
            className="ubl-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Location'}
          </button>
          <button className="ubl-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateBaseLocation;
