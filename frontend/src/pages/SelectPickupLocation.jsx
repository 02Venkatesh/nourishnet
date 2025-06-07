import React, { useEffect, useRef, useState } from 'react';
import {
  GoogleMap,
  MarkerF,
  StandaloneSearchBox,
  useJsApiLoader,
} from '@react-google-maps/api';
import { useLocation, useNavigate } from 'react-router-dom';
import './SelectPickupLocation.css';

const containerStyle = {
  width: '100%',
  height: '400px',
};


const defaultCenter = {
  lat: 13.0827,
  lng: 80.2707,
};

const libraries = ['places'];

function SelectPickupLocation({ setCart }) {
  const mapRef = useRef(null);
  const searchBoxRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const [coords, setCoords] = useState(defaultCenter);
  const [address, setAddress] = useState('Fetching address...');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // ✅ Reverse geocode updated coords
  useEffect(() => {
    if (!coords.lat || !coords.lng) return;

    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        console.log("Geocode result:", data);

        if (data.status === 'OK' && data.results && data.results.length > 0) {
          setAddress(data.results[0].formatted_address);
        } else {
          setAddress('📍 Address not found');
        }
      } catch (err) {
        console.error('Geocoding error:', err);
        setAddress('📍 Address not found');
      }
    };

    fetchAddress();
  }, [coords]);

const handleConfirm = async () => {
  const token = localStorage.getItem('token');
  const items = location.state?.itemsToDonate;

  if (!items || items.length === 0) {
    alert('❌ No donation items found');
    return;
  }

  try {
    // 1. Save donation (with items)
    const donationRes = await fetch('http://localhost:5000/api/donation/donate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
    });

    const donationData = await donationRes.json();
    if (!donationRes.ok) throw new Error(donationData.error || 'Donation failed');

    const donationId = donationData.donation_id;
    if (!donationId) throw new Error('No donation ID returned');

    // 2. Save pickup location
    const locationRes = await fetch('http://localhost:5000/api/donation/location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        donation_id: donationId,
        lat: coords.lat,
        lng: coords.lng,
        address,
      }),
    });

    if (!locationRes.ok) throw new Error('Failed to save location');

     setCart([]);
    navigate('/dashboard/donor');

  } catch (err) {
    console.error(err);
    alert(`❌ ${err.message}`);
  }
};


  // ✅ Get current GPS location
  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
  (pos) =>
    setCoords({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    }),
  (err) => alert('Unable to fetch location'),
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // 👈 improves accuracy
);
  };

  // ✅ Searchbox logic
  const onPlacesChanged = () => {
    const places = searchBoxRef.current?.getPlaces();
    if (!places || places.length === 0) {
      alert('❌ No place selected. Please choose from suggestions.');
      return;
    }

    const place = places[0];
    if (place.geometry && place.geometry.location) {
      setCoords({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    } else {
      alert('❌ Could not get location from selected place');
    }
  };

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    

  <div className="location-wrapper">
    <button
  onClick={() => navigate('/dashboard/donor/cart')}
  className="back-button"
>
  ← Back to Cart
</button>
    <h2 className="location-header">Select Pickup Location</h2>

    <div className="search-box">
      <StandaloneSearchBox
        onLoad={(ref) => (searchBoxRef.current = ref)}
        onPlacesChanged={onPlacesChanged}
      >
        <input
          type="text"
          placeholder="Search for a place..."
        />
      </StandaloneSearchBox>
    </div>

    <div className="map-container">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={coords}
        zoom={17}
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

    <div className="address-display">
      📍 <span>{address}</span>
    </div>

    <div className="button-row">
      <button onClick={useCurrentLocation}>Use Current Location</button>
      <button onClick={handleConfirm}>Confirm Location</button>
    </div>

    <div className="tip-box">
      <span>🔔</span> 
      <span>Note: Your device location may be approximate. Please drag the pin to your exact pickup spot.</span>
    </div>
  </div>
);



}

export default SelectPickupLocation;
