import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function OAuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('token', token);

      fetch('https://nourishnet-backend-wgz2.onrender.com/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(user => {
          localStorage.setItem('user', JSON.stringify(user));

          if (user.role === 'donor') {
            navigate('/dashboard/donor');
          } else if (user.role === 'recipient') {
            localStorage.setItem('recipientLat', user.base_lat);
            localStorage.setItem('recipientLng', user.base_lng);
            localStorage.setItem('recipientAddress', user.base_address);
            navigate('/dashboard/recipient');
          } else {
            alert('Login failed');
            navigate('/');
          }
        })
        .catch(() => {
          alert('Login failed');
          navigate('/');
        });
    } else {
      alert('Login failed');
      navigate('/');
    }
  }, [navigate]);

  return <p>Redirecting...</p>;
}

export default OAuthSuccess;
