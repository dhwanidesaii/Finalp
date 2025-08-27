import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { GOOGLE_MAPS_CONFIG, MAP_ICONS } from '../config/googleMaps';
import './OrderTracking.css';

const OrderTracking = ({ orderId, onClose }) => {
  const [orderData, setOrderData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState({});
  const [routePath, setRoutePath] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const mapRef = useRef(null);
  const intervalRef = useRef(null);

  // Load Google Maps
  const initializeMap = useCallback(async () => {
    try {
      const loader = new Loader({
        apiKey: GOOGLE_MAPS_CONFIG.apiKey,
        version: 'weekly',
        libraries: ['geometry', 'places']
      });

      const google = await loader.load();
      
      if (mapRef.current) {
        const mapInstance = new google.maps.Map(mapRef.current, {
          center: GOOGLE_MAPS_CONFIG.VADODARA_CENTER,
          zoom: GOOGLE_MAPS_CONFIG.TRACKING_ZOOM,
          styles: GOOGLE_MAPS_CONFIG.mapStyles,
          ...GOOGLE_MAPS_CONFIG.mapOptions
        });

        setMap(mapInstance);
        return mapInstance;
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      setError('Failed to load map. Please check your internet connection.');
    }
  }, []);

  // Fetch order tracking data
  const fetchTrackingData = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/tracking/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }

      const data = await response.json();
      setOrderData(data);
      setLastUpdate(new Date());
      
      return data;
    } catch (error) {
      console.error('Error fetching tracking data:', error);
      setError('Failed to load tracking information');
    }
  }, [orderId]);

  // Update map markers and route
  const updateMapDisplay = useCallback(async (data, mapInstance) => {
    if (!mapInstance || !data) return;

    const google = window.google;
    const bounds = new google.maps.LatLngBounds();

    // Clear existing markers
    Object.values(markers).forEach(marker => marker.setMap(null));
    if (routePath) routePath.setMap(null);

    const newMarkers = {};

    // Restaurant marker
    if (data.restaurant && data.restaurant.location) {
      const restaurantMarker = new google.maps.Marker({
        position: {
          lat: data.restaurant.location.latitude,
          lng: data.restaurant.location.longitude
        },
        map: mapInstance,
        title: data.restaurant.name,
        icon: MAP_ICONS.RESTAURANT
      });

      const restaurantInfo = new google.maps.InfoWindow({
        content: `
          <div class="marker-info">
            <h3>${data.restaurant.name}</h3>
            <p>📍 ${data.restaurant.address}</p>
            <p>📞 ${data.restaurant.phone}</p>
          </div>
        `
      });

      restaurantMarker.addListener('click', () => {
        restaurantInfo.open(mapInstance, restaurantMarker);
      });

      newMarkers.restaurant = restaurantMarker;
      bounds.extend(restaurantMarker.getPosition());
    }

    // Delivery location marker
    if (data.deliveryAddress && data.deliveryAddress.coordinates) {
      const deliveryMarker = new google.maps.Marker({
        position: {
          lat: data.deliveryAddress.coordinates.latitude,
          lng: data.deliveryAddress.coordinates.longitude
        },
        map: mapInstance,
        title: 'Delivery Location',
        icon: MAP_ICONS.DELIVERY_LOCATION
      });

      const deliveryInfo = new google.maps.InfoWindow({
        content: `
          <div class="marker-info">
            <h3>🏠 Delivery Location</h3>
            <p>${data.deliveryAddress.street}</p>
            <p>${data.deliveryAddress.city}</p>
          </div>
        `
      });

      deliveryMarker.addListener('click', () => {
        deliveryInfo.open(mapInstance, deliveryMarker);
      });

      newMarkers.delivery = deliveryMarker;
      bounds.extend(deliveryMarker.getPosition());
    }

    // Driver marker (if out for delivery)
    if (data.tracking?.currentLocation && data.status === 'out_for_delivery') {
      const driverMarker = new google.maps.Marker({
        position: {
          lat: data.tracking.currentLocation.latitude,
          lng: data.tracking.currentLocation.longitude
        },
        map: mapInstance,
        title: `Driver: ${data.driver?.name || 'Unknown'}`,
        icon: MAP_ICONS.DRIVER_MOVING,
        animation: google.maps.Animation.BOUNCE
      });

      const driverInfo = new google.maps.InfoWindow({
        content: `
          <div class="marker-info">
            <h3>🚗 ${data.driver?.name || 'Driver'}</h3>
            <p>📞 ${data.driver?.phone || 'N/A'}</p>
            <p>🚗 ${data.driver?.vehicleNumber || 'N/A'}</p>
            <p>⭐ Rating: ${data.driver?.rating || 'N/A'}/5</p>
            <p>📍 Last updated: ${new Date(data.tracking.lastUpdate).toLocaleTimeString()}</p>
          </div>
        `
      });

      driverMarker.addListener('click', () => {
        driverInfo.open(mapInstance, driverMarker);
      });

      newMarkers.driver = driverMarker;
      bounds.extend(driverMarker.getPosition());

      // Draw delivery path if available
      if (data.tracking.deliveryPath && data.tracking.deliveryPath.length > 1) {
        const pathCoordinates = data.tracking.deliveryPath.map(point => ({
          lat: point.latitude,
          lng: point.longitude
        }));

        const deliveryPath = new google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: '#FF6B35',
          strokeOpacity: 1.0,
          strokeWeight: 3,
          icons: [{
            icon: {
              path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
              scale: 2,
              strokeColor: '#FF6B35'
            },
            offset: '100%'
          }]
        });

        deliveryPath.setMap(mapInstance);
        setRoutePath(deliveryPath);
      }
    }

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (!bounds.isEmpty()) {
      mapInstance.fitBounds(bounds);
      
      // Ensure minimum zoom level for Vadodara
      const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
        if (mapInstance.getZoom() > 16) mapInstance.setZoom(16);
        google.maps.event.removeListener(listener);
      });
    }
  }, [markers, routePath]);

  // Get status color and icon
  const getStatusInfo = (status) => {
    const statusMap = {
      pending: { color: '#FFA500', icon: '⏳', text: 'Order Received' },
      confirmed: { color: '#4CAF50', icon: '✅', text: 'Order Confirmed' },
      preparing: { color: '#2196F3', icon: '👨‍🍳', text: 'Being Prepared' },
      ready: { color: '#9C27B0', icon: '📦', text: 'Ready for Pickup' },
      out_for_delivery: { color: '#FF6B35', icon: '🚗', text: 'Out for Delivery' },
      delivered: { color: '#4CAF50', icon: '🎉', text: 'Delivered' },
      cancelled: { color: '#F44336', icon: '❌', text: 'Cancelled' }
    };
    
    return statusMap[status] || { color: '#757575', icon: '❓', text: 'Unknown' };
  };

  // Format time remaining
  const formatTimeRemaining = (minutes) => {
    if (!minutes) return 'Calculating...';
    
    if (minutes < 60) {
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
  };

  // Initialize tracking
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      
      try {
        const mapInstance = await initializeMap();
        const trackingData = await fetchTrackingData();
        
        if (mapInstance && trackingData) {
          await updateMapDisplay(trackingData, mapInstance);
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    // Set up polling for live updates
    intervalRef.current = setInterval(async () => {
      if (orderData?.status === 'out_for_delivery') {
        const updatedData = await fetchTrackingData();
        if (updatedData && map) {
          await updateMapDisplay(updatedData, map);
        }
      }
    }, 30000); // Update every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initializeMap, fetchTrackingData, updateMapDisplay, map, orderData?.status]);

  if (isLoading) {
    return (
      <div className="tracking-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-container">
        <div className="error-message">
          <h3>⚠️ Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="tracking-container">
        <div className="error-message">
          <h3>📦 Order Not Found</h3>
          <p>Unable to find tracking information for order: {orderId}</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(orderData.status);

  return (
    <div className="tracking-container">
      <div className="tracking-header">
        <div className="order-info">
          <h2>🍕 Order #{orderData.orderId}</h2>
          <div className="status-badge" style={{ backgroundColor: statusInfo.color }}>
            <span className="status-icon">{statusInfo.icon}</span>
            <span className="status-text">{statusInfo.text}</span>
          </div>
        </div>
        
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="tracking-content">
        <div className="map-section">
          <div ref={mapRef} className="tracking-map"></div>
          
          {lastUpdate && (
            <div className="last-update">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="tracking-details">
          <div className="delivery-info">
            <h3>📍 Delivery Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Address:</strong>
                <p>{orderData.deliveryAddress?.street}, {orderData.deliveryAddress?.city}</p>
              </div>
              
              {orderData.tracking?.estimatedTimeRemaining && (
                <div className="info-item">
                  <strong>ETA:</strong>
                  <p className="eta-time">
                    {formatTimeRemaining(orderData.tracking.estimatedTimeRemaining)}
                  </p>
                </div>
              )}
              
              {orderData.tracking?.distanceRemaining && (
                <div className="info-item">
                  <strong>Distance:</strong>
                  <p>{orderData.tracking.distanceRemaining} km</p>
                </div>
              )}
            </div>
          </div>

          {orderData.driver && (
            <div className="driver-info">
              <h3>🚗 Driver Information</h3>
              <div className="driver-details">
                <p><strong>Name:</strong> {orderData.driver.name}</p>
                <p><strong>Phone:</strong> {orderData.driver.phone}</p>
                <p><strong>Vehicle:</strong> {orderData.driver.vehicleNumber}</p>
                <p><strong>Rating:</strong> ⭐ {orderData.driver.rating}/5</p>
              </div>
            </div>
          )}

          <div className="restaurant-info">
            <h3>🏪 Restaurant Information</h3>
            <div className="restaurant-details">
              <p><strong>Name:</strong> {orderData.restaurant?.name}</p>
              <p><strong>Phone:</strong> {orderData.restaurant?.phone}</p>
            </div>
          </div>

          {orderData.status === 'out_for_delivery' && (
            <div className="live-tracking-notice">
              <div className="pulse-dot"></div>
              <span>Live tracking active - Updates every 30 seconds</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;