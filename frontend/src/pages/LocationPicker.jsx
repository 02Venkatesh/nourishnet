//LocationPicker.jsx
import React, { useEffect, useRef, useState } from 'react';

const LocationPicker = ({ onSelect }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const initMap = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const initialPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        const mapInstance = new window.google.maps.Map(mapRef.current, {
          center: initialPosition,
          zoom: 14,
        });

        const marker = new window.google.maps.Marker({
          position: initialPosition,
          map: mapInstance,
          draggable: true,
        });

        markerRef.current = marker;

        // When user drags marker
        marker.addListener("dragend", async () => {
          const position = marker.getPosition();
          const lat = position.lat();
          const lng = position.lng();

          const geocoder = new window.google.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: { lat, lng } });

          onSelect({ lat, lng, address: results?.[0]?.formatted_address || "" });
        });

        setMap(mapInstance);
      });
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }
  }, [onSelect]);

  return <div ref={mapRef} style={{ width: '100%', height: '300px', marginTop: '1rem' }} />;
};

export default LocationPicker;
