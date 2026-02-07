/**
 * OPAL Admin Panel
 * Main JavaScript file for the admin panel
 */

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize authentication
  initAuth();
  
  // Initialize tab navigation
  initTabs();
});

// Initialize authentication
function initAuth() {
  const loginContainer = document.getElementById('login-container');
  const adminPanel = document.getElementById('admin-panel');
  const userInfo = document.getElementById('user-info');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const loginError = document.getElementById('login-error');
  
  // Check if user is already authenticated
  if (AuthService.isAuthenticated()) {
    showAdminPanel();
  } else {
    showLoginForm();
  }
  
  // Login form submission handler
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent form submission
    loginError.textContent = ''; // Clear previous errors
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
      loginError.textContent = 'Username and password are required';
      return;
    }
    
    // Show loading state
    loginButton.disabled = true;
    loginButton.innerHTML = '<span class="spinner"></span> Logging in...';
    
    try {
      const result = await AuthService.login(username, password);
      
      if (result.success) {
        showAdminPanel();
      } else {
        loginError.textContent = result.error || 'Login failed';
      }
    } catch (error) {
      console.error('Login error:', error);
      loginError.textContent = error.message || 'An unexpected error occurred';
    } finally {
      // Reset button state
      loginButton.disabled = false;
      loginButton.textContent = 'Login';
    }
  });
  
  // Login button click handler (for non-form submission)
  loginButton.addEventListener('click', () => {
    // The form submit handler will take care of the actual login
    // This is just to ensure the button works even if clicked directly
    document.getElementById('login-form').dispatchEvent(new Event('submit'));
  });
  
  // Logout button click handler
  logoutButton.addEventListener('click', async () => {
    try {
      // Show loading state
      logoutButton.disabled = true;
      logoutButton.innerHTML = '<span class="spinner"></span> Logging out...';
      
      await AuthService.logout();
      showLoginForm();
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error during logout: ' + error.message);
    } finally {
      // Reset button state
      logoutButton.disabled = false;
      logoutButton.textContent = 'Logout';
    }
  });
  
  // Show login form
  function showLoginForm() {
    // Clear login form
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginError.textContent = '';
    
    loginContainer.style.display = 'block';
    adminPanel.style.display = 'none';
    document.title = 'OPAL Admin Panel - Login';
  }
  
  // Show admin panel
  function showAdminPanel() {
    const user = AuthService.getCurrentUser();
    if (!user) {
      // If no user is found, show login form
      showLoginForm();
      return;
    }
    
    loginContainer.style.display = 'none';
    adminPanel.style.display = 'block';
    userInfo.textContent = `${user.username} (${user.role})`;
    document.title = 'OPAL Admin Panel';
    
    // Initialize all managers
    MemoryManager.init();
    AuditManager.init();
    TokenManager.init();
    BackupManager.init();
    
    // Initialize Sidecar Manager
    if (window.SidecarManager) {
      window.sidecarManager = new SidecarManager(ApiService);
    }
  }
}

// API Service for handling backend requests
window.ApiService = window.ApiService || {
  // Base URL for API requests
  baseUrl: '/api',
  
  // Get authentication token from localStorage
  getToken() {
    return localStorage.getItem('accessToken');
  },
  
  // Headers for authenticated requests
  authHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    };
  },
  
  // Generic API request method
  async request(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: this.authHeaders(),
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(url, options);
      
      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the request with new token
          options.headers = this.authHeaders();
          const retryResponse = await fetch(url, options);
          return await retryResponse.json();
        } else {
          // Redirect to login if refresh failed
          AuthService.logout();
          return null;
        }
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
  
  // Refresh the access token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  },
  
  // Authentication methods
  auth: {
    async login(username, password) {
      const response = await fetch(`${ApiService.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      return await response.json();
    }
  },
  
  // Memory methods
  memories: {
    async getAll(limit = 50, offset = 0) {
      return ApiService.request(`/memory?limit=${limit}&offset=${offset}`);
    },
    
    async search(query) {
      return ApiService.request('/memory/search', 'POST', { query });
    },
    
    async create(title, content, metadata = {}) {
      return ApiService.request('/memory', 'POST', { title, content, metadata });
    },
    
    async update(id, data) {
      return ApiService.request(`/memory/${id}`, 'PUT', data);
    },
    
    async delete(id) {
      return ApiService.request(`/memory/${id}`, 'DELETE');
    }
  },
  
  // Tool runs (audit) methods
  toolRuns: {
    async getAll(limit = 50, offset = 0) {
      return ApiService.request(`/audit/tool-runs?limit=${limit}&offset=${offset}`);
    },
    
    async getStats() {
      return ApiService.request('/audit/stats');
    }
  },
  
  // API token methods
  tokens: {
    async getAll() {
      return ApiService.request('/auth/token');
    },
    
    async create(name, permissions = {}, expiresIn = 30) {
      return ApiService.request('/auth/token', 'POST', { name, permissions, expiresIn });
    },
    
    async delete(id) {
      return ApiService.request(`/auth/token/${id}`, 'DELETE');
    }
  },
  
  // Backup methods
  backups: {
    async getAll() {
      return ApiService.request('/backup');
    },
    
    async create(name = '') {
      return ApiService.request('/backup', 'POST', { name });
    },
    
    async restore(filename) {
      return ApiService.request('/backup/restore', 'POST', { filename });
    },
    
    async delete(filename) {
      return ApiService.request(`/backup/${filename}`, 'DELETE');
    }
  },
  
  // Tool execution methods
  async callTool(toolName, args = {}) {
    try {
      // Call MCP endpoint directly
      const response = await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MCP-Protocol-Version': '2025-06-18'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `call-${Date.now()}`,
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Tool execution failed');
      }
      
      return data.result;
    } catch (error) {
      console.error(`Tool call failed (${toolName}):`, error);
      throw error;
    }
  },
  
  // API Integration methods
  apiIntegrations: {
    async getAll() {
      return ApiService.request('/api-integrations');
    },
    
    async get(id) {
      return ApiService.request(`/api-integrations/${id}`);
    }
  }
};

// Authentication Service
window.AuthService = window.AuthService || {
  init() {
    this.checkAuth();
    this.setupLoginForm();
    this.setupLogoutButton();
  },
  
  checkAuth() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (token && user.username) {
      this.showAdminPanel(user);
    } else {
      this.showLoginForm();
    }
  },
  
  setupLoginForm() {
    const loginButton = document.getElementById('login-button');
    if (loginButton) {
      loginButton.addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
          const data = await ApiService.auth.login(username, password);
          
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          this.showAdminPanel(data.user);
          
          // Load initial data
          MemoryManager.loadMemories();
          AuditManager.loadToolRuns();
          TokenManager.loadTokens();
          BackupManager.loadBackups();
        } catch (error) {
          document.getElementById('login-error').textContent = 'Invalid username or password';
        }
      });
    }
  },
  
  setupLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        this.logout();
      });
    }
  },
  
  showLoginForm() {
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
  },
  
  showAdminPanel(user) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    document.getElementById('user-info').textContent = `${user.username} (${user.role})`;
  },
  
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.showLoginForm();
  }
};

// Memory Manager
window.MemoryManager = window.MemoryManager || {
  init() {
    this.setupSearchForm();
    this.setupCreateForm();
  },
  
  async loadMemories() {
    try {
      const memories = await ApiService.memories.getAll();
      this.renderMemories(memories);
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  },
  
  renderMemories(memories) {
    const container = document.getElementById('memories-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (memories.length === 0) {
      container.innerHTML = '<tr><td colspan="4">No memories found</td></tr>';
      return;
    }
    
    memories.forEach(memory => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${this.escapeHtml(memory.title)}</td>
        <td>${this.truncateText(this.escapeHtml(memory.content), 100)}</td>
        <td>${new Date(memory.created_at).toLocaleString()}</td>
        <td>
          <button class="edit-memory" data-id="${memory.id}">Edit</button>
          <button class="delete-memory" data-id="${memory.id}">Delete</button>
        </td>
      `;
      
      container.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-memory').forEach(button => {
      button.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        this.showEditForm(id);
      });
    });
    
    document.querySelectorAll('.delete-memory').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this memory?')) {
          await ApiService.memories.delete(id);
          this.loadMemories();
        }
      });
    });
  },
  
  setupSearchForm() {
    const searchButton = document.getElementById('search-memory-button');
    if (searchButton) {
      searchButton.addEventListener('click', async () => {
        const query = document.getElementById('memory-search').value;
        if (query.trim()) {
          const results = await ApiService.memories.search(query);
          this.renderMemories(results);
        } else {
          this.loadMemories();
        }
      });
    }
  },
  
  setupCreateForm() {
    // Implementation for memory creation form
  },
  
  showEditForm(id) {
    // Implementation for memory editing
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
};

// Audit Manager
window.AuditManager = window.AuditManager || {
  async loadToolRuns() {
    try {
      const toolRuns = await ApiService.toolRuns.getAll();
      this.renderToolRuns(toolRuns);
    } catch (error) {
      console.error('Failed to load tool runs:', error);
    }
  },
  
  renderToolRuns(toolRuns) {
    const container = document.getElementById('tool-runs-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (toolRuns.length === 0) {
      container.innerHTML = '<tr><td colspan="4">No tool runs found</td></tr>';
      return;
    }
    
    toolRuns.forEach(run => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${run.tool_name}</td>
        <td>${JSON.stringify(JSON.parse(run.parameters || '{}'))}</td>
        <td>${run.status}</td>
        <td>${new Date(run.executed_at).toLocaleString()}</td>
      `;
      
      container.appendChild(row);
    });
  }
};

// Token Manager
window.TokenManager = window.TokenManager || {
  async loadTokens() {
    try {
      const tokens = await ApiService.tokens.getAll();
      this.renderTokens(tokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  },
  
  renderTokens(tokens) {
    const container = document.getElementById('tokens-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (tokens.length === 0) {
      container.innerHTML = '<tr><td colspan="5">No API tokens found</td></tr>';
      return;
    }
    
    tokens.forEach(token => {
      const row = document.createElement('tr');
      const permissions = JSON.parse(token.permissions || '{}');
      const expires = token.expires_at ? new Date(token.expires_at).toLocaleString() : 'Never';
      
      row.innerHTML = `
        <td>${token.name}</td>
        <td>${token.token.substring(0, 8)}...</td>
        <td>${Object.keys(permissions).filter(k => permissions[k]).join(', ')}</td>
        <td>${expires}</td>
        <td>
          <button class="delete-token" data-id="${token.id}">Delete</button>
        </td>
      `;
      
      container.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.delete-token').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this token?')) {
          await ApiService.tokens.delete(id);
          this.loadTokens();
        }
      });
    });
  }
};

// Backup Manager
window.BackupManager = window.BackupManager || {
  init() {
    this.setupCreateButton();
  },
  
  async loadBackups() {
    try {
      const backups = await ApiService.backups.getAll();
      this.renderBackups(backups);
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  },
  
  renderBackups(backups) {
    const container = document.getElementById('backups-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (backups.length === 0) {
      container.innerHTML = '<tr><td colspan="4">No backups found</td></tr>';
      return;
    }
    
    backups.forEach(backup => {
      const row = document.createElement('tr');
      const size = (backup.size / (1024 * 1024)).toFixed(2) + ' MB';
      
      row.innerHTML = `
        <td>${backup.filename}</td>
        <td>${new Date(backup.timestamp).toLocaleString()}</td>
        <td>${size}</td>
        <td>
          <button class="restore-backup" data-filename="${backup.filename}">Restore</button>
          <button class="delete-backup" data-filename="${backup.filename}">Delete</button>
        </td>
      `;
      
      container.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.restore-backup').forEach(button => {
      button.addEventListener('click', async (e) => {
        const filename = e.target.getAttribute('data-filename');
        if (confirm('Are you sure you want to restore this backup? This will overwrite the current database.')) {
          await ApiService.backups.restore(filename);
          alert('Backup restored successfully. The page will now reload.');
          window.location.reload();
        }
      });
    });
    
    document.querySelectorAll('.delete-backup').forEach(button => {
      button.addEventListener('click', async (e) => {
        const filename = e.target.getAttribute('data-filename');
        if (confirm('Are you sure you want to delete this backup?')) {
          await ApiService.backups.delete(filename);
          this.loadBackups();
        }
      });
    });
  },
  
  setupCreateButton() {
    const createButton = document.getElementById('create-backup-button');
    if (createButton) {
      createButton.addEventListener('click', async () => {
        const name = prompt('Enter a name for the backup (optional):');
        await ApiService.backups.create(name || '');
        this.loadBackups();
      });
    }
  }
};

// Tab Manager
// Tab navigation is now handled by tab-navigation.js

// This initialization is now handled at the top of the file
