const API_BASE_URL = (typeof window !== 'undefined' && window.__API_BASE__) || process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

// Helper function to handle API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('jwt_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  // Check if phone number is registered
  checkPhoneNumber: (phoneNumber) => apiRequest('/auth/check-phone', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  }),
  
  // Send OTP for login
  sendLoginOTP: (phoneNumber) => apiRequest('/auth/send-login-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  }),
  
  // Send OTP for registration
  sendRegistrationOTP: (phoneNumber) => apiRequest('/auth/send-registration-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  }),
  
  // Verify OTP for login
  verifyLoginOTP: (phoneNumber, idToken) => apiRequest('/auth/verify-login-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, idToken }),
  }),
  
  // Verify OTP for registration
  verifyRegistrationOTP: (phoneNumber, idToken, userData) => apiRequest('/auth/verify-registration-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, idToken, userData }),
  }),
  
  register: (userData) => apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  
  logout: () => apiRequest('/auth/logout', {
    method: 'POST',
  }),
  
  getCurrentUser: () => apiRequest('/auth/me'),
};

// Restaurants API
export const restaurantsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/restaurants?${queryString}`);
  },
  
  getById: (id) => apiRequest(`/restaurants/${id}`),
  
  getBySlug: (slug) => apiRequest(`/restaurants/slug/${slug}`),
  
  getMenu: (id) => apiRequest(`/restaurants/${id}/menu`),
  
  create: (restaurantData) => apiRequest('/restaurants', {
    method: 'POST',
    body: JSON.stringify(restaurantData),
  }),
  
  update: (id, restaurantData) => apiRequest(`/restaurants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(restaurantData),
  }),
  
  delete: (id) => apiRequest(`/restaurants/${id}`, {
    method: 'DELETE',
  }),
};

// Dishes API
export const dishesAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/dishes?${queryString}`);
  },
  
  getById: (id) => apiRequest(`/dishes/${id}`),
  
  create: (dishData) => apiRequest('/dishes', {
    method: 'POST',
    body: JSON.stringify(dishData),
  }),
  
  update: (id, dishData) => apiRequest(`/dishes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dishData),
  }),
  
  delete: (id) => apiRequest(`/dishes/${id}`, {
    method: 'DELETE',
  }),
  
  rate: (id, rating) => apiRequest(`/dishes/${id}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  }),
};

// Users API
export const usersAPI = {
  getProfile: () => apiRequest('/users/profile'),
  
  updateProfile: (profileData) => apiRequest('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }),

  uploadAvatar: async (file) => {
    const url = `${API_BASE_URL}/users/upload-avatar`;
    const token = localStorage.getItem('jwt_token');
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  
  getOrders: () => apiRequest('/users/orders'),
  
  addFavorite: (type, id) => apiRequest('/users/favorites', {
    method: 'POST',
    body: JSON.stringify({ type, id }),
  }),
  
  getFavorites: () => apiRequest('/users/favorites'),
};

// Orders API
export const ordersAPI = {
  getAll: () => apiRequest('/orders'),
  
  getById: (id) => apiRequest(`/orders/${id}`),
  
  create: (orderData) => apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  }),
  
  updateStatus: (id, status) => apiRequest(`/orders/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  getAvailable: () => apiRequest('/orders/available/list'),
  assign: (id) => apiRequest(`/orders/${id}/assign`, { method: 'POST' }),
  acceptByRestaurant: (id) => apiRequest(`/orders/${id}/accept-restaurant`, { method: 'POST' }),
  rejectByRestaurant: (id) => apiRequest(`/orders/${id}/reject-restaurant`, { method: 'POST' }),
  markReadyForPickup: (id) => apiRequest(`/orders/${id}/mark-ready`, { method: 'POST' }),
  reassignDriver: (id, driver) => apiRequest(`/orders/${id}/reassign-driver`, {
    method: 'POST',
    body: JSON.stringify(driver || {}),
  }),
};

export default {
  auth: authAPI,
  restaurants: restaurantsAPI,
  dishes: dishesAPI,
  users: usersAPI,
  orders: ordersAPI,
};
