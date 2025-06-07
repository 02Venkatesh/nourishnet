import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  MarkerF,
} from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
};

// ✅ Declare outside to avoid reloading warning
const libraries = ['places'];

const MapModal = ({ donation, onClose }) => {
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');

  // ✅ Read recipient location from localStorage (set during login)
  const recipientLat = parseFloat(localStorage.getItem('recipientLat'));
  const recipientLng = parseFloat(localStorage.getItem('recipientLng'));

  // ✅ Donor pickup location
  const pickupLat = parseFloat(donation?.pickup_lat);
  const pickupLng = parseFloat(donation?.pickup_lng);

  // ✅ Memoize coordinates to prevent re-renders
  const recipientLoc = useMemo(() => ({ lat: recipientLat, lng: recipientLng }), [recipientLat, recipientLng]);
  const donorLoc = useMemo(() => ({ lat: pickupLat, lng: pickupLng }), [pickupLat, pickupLng]);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  useEffect(() => {
    if (!isLoaded || !donation || !recipientLat || !recipientLng || !pickupLat || !pickupLng) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: recipientLoc,
        destination: donorLoc,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          setDirections(result);
          const leg = result.routes[0].legs[0];
          setDistance(leg.distance.text);
          setDuration(leg.duration.text);
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [isLoaded, donation]);

  if (!isLoaded) return null;

  return (
    <div className="modal" style={{
      position: 'fixed',
      top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999
    }}>
      <div className="modal-content" style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '850px',
        height: '550px',
        overflow: 'hidden'
      }}>
        <span onClick={onClose} className="close" style={{
          float: 'right',
          cursor: 'pointer',
          fontSize: '24px'
        }}>&times;</span>

        <h3>Pickup Route</h3>

        <GoogleMap
          mapContainerStyle={containerStyle}
          defaultZoom={12}
          defaultCenter={recipientLoc}
          onLoad={(map) => {
            mapRef.current = map;
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(recipientLoc);
            bounds.extend(donorLoc);
            map.fitBounds(bounds); // ✅ show both points
          }}
        >
          <MarkerF position={recipientLoc} label="Your Location" />
          <MarkerF position={donorLoc} label="Pickup" />
          {directions && <DirectionsRenderer directions={directions} />}
        </GoogleMap>

        <div style={{ marginTop: '12px' }}>
          <strong>Distance:</strong> {distance} <br />
          <strong>Estimated Time:</strong> {duration}
        </div>
      </div>
    </div>
  );
};

export default MapModal;
