/**
 * Authentication Service for OPAL Admin Panel
 * Handles login, logout, and token management
 */

const AuthService = {
  // API base URL
  apiBaseUrl: '/api',
  
  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    
    // Check if token is expired
    const tokenData = this.parseJwt(token);
    if (tokenData && tokenData.exp) {
      const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
      if (Date.now() >= expirationTime) {
        // Token is expired, clear it
        this.logout();
        return false;
      }
    }
    
    return true;
  },
  
  // Parse JWT token to get payload
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error parsing JWT:', e);
      return null;
    }
  },
  
  // Get current user info
  getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  },
  
  // Login function using real API
  async login(username, password) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const authData = await response.json();
      
      // Store tokens and user data
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('currentUser', JSON.stringify(authData.user));
      
      return { success: true, user: authData.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Refresh token function
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token refresh failed');
      }
      
      const authData = await response.json();
      
      // Update access token
      localStorage.setItem('accessToken', authData.accessToken);
      
      return { success: true };
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, log the user out
      this.logout();
      return { success: false, error: error.message };
    }
  },
  
  // Get auth headers for API requests
  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
    };
  },
  
  // Logout function
  async logout() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        // Call the logout API to invalidate the refresh token
        await fetch(`${this.apiBaseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify({ refreshToken })
        }).catch(err => console.warn('Error during logout API call:', err));
      }
    } catch (error) {
      console.warn('Error during logout:', error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
      window.location.reload();
    }
  }
};

// Export for use in other files
window.AuthService = AuthService;
