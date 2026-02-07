/**
 * Sidecar Management Module
 * 
 * Handles the Sidecar Management tab in the OPAL Admin Panel
 * Provides functionality for registering, monitoring, and managing external MCP servers
 */

class SidecarManager {
  constructor(apiService) {
    this.apiService = apiService;
    this.sidecars = [];
    this.sidecarTools = [];
    this.refreshInterval = null;
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.startAutoRefresh();
  }

  bindEvents() {
    // Main action buttons
    document.getElementById('register-sidecar-button')?.addEventListener('click', () => this.showRegisterSidecarDialog());
    document.getElementById('refresh-sidecars-button')?.addEventListener('click', () => this.refreshSidecars());
    document.getElementById('health-check-all-button')?.addEventListener('click', () => this.healthCheckAll());
    
    // Tool search
    document.getElementById('search-tools-button')?.addEventListener('click', () => this.searchTools());
    document.getElementById('tool-search')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.searchTools();
    });
    
    // Sidecar filter
    document.getElementById('sidecar-filter')?.addEventListener('change', () => this.filterTools());
  }

  startAutoRefresh() {
    // Disabled auto-refresh until sidecar backend is implemented
    // TODO: Enable when sidecar endpoints are available
    // this.refreshInterval = setInterval(() => {
    //   this.refreshSidecars();
    // }, 30000);
    console.log('Sidecar auto-refresh disabled - sidecar endpoints not yet implemented');
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async showRegisterSidecarDialog() {
    const dialog = `
      <div class="modal-overlay" id="register-sidecar-modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Register New Sidecar MCP Server</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
          </div>
          <form id="register-sidecar-form" class="modal-form">
            <div class="form-group">
              <label for="sidecar-name">Name *</label>
              <input type="text" id="sidecar-name" required placeholder="e.g., jama, jira">
              <small>Unique identifier for this sidecar</small>
            </div>
            
            <div class="form-group">
              <label for="sidecar-url">URL *</label>
              <input type="url" id="sidecar-url" required placeholder="http://localhost:3001">
              <small>Base URL where the sidecar MCP server is running</small>
            </div>
            
            <div class="form-group">
              <label for="sidecar-transport">Transport *</label>
              <select id="sidecar-transport" required>
                <option value="http">HTTP</option>
                <option value="wss">WebSocket (WSS)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="sidecar-tenant">Tenant</label>
              <input type="text" id="sidecar-tenant" placeholder="demo">
              <small>Tenant identifier (optional)</small>
            </div>
            
            <div class="form-group">
              <label for="sidecar-auth-type">Auth Type</label>
              <select id="sidecar-auth-type">
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="mtls">Mutual TLS</option>
              </select>
            </div>
            
            <div class="form-group" id="auth-token-group" style="display: none;">
              <label for="sidecar-auth-token">Auth Token</label>
              <input type="password" id="sidecar-auth-token" placeholder="Bearer token or vault reference">
            </div>
            
            <div class="form-group">
              <label for="sidecar-scopes">Scopes</label>
              <input type="text" id="sidecar-scopes" placeholder="artifacts.read,artifacts.write,projects.read">
              <small>Comma-separated list of permission scopes</small>
            </div>
            
            <div class="modal-actions">
              <button type="button" class="secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="submit" class="primary">Register Sidecar</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', dialog);
    
    // Handle auth type changes
    document.getElementById('sidecar-auth-type').addEventListener('change', (e) => {
      const tokenGroup = document.getElementById('auth-token-group');
      tokenGroup.style.display = e.target.value === 'bearer' ? 'block' : 'none';
    });
    
    // Handle form submission
    document.getElementById('register-sidecar-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.registerSidecar();
    });
  }

  async registerSidecar() {
    const formData = {
      name: document.getElementById('sidecar-name').value,
      url: document.getElementById('sidecar-url').value,
      transport: document.getElementById('sidecar-transport').value,
      tenant: document.getElementById('sidecar-tenant').value || 'default',
      auth: {
        type: document.getElementById('sidecar-auth-type').value
      },
      scopes: document.getElementById('sidecar-scopes').value.split(',').map(s => s.trim()).filter(s => s)
    };
    
    // Add auth token if specified
    if (formData.auth.type === 'bearer') {
      const token = document.getElementById('sidecar-auth-token').value;
      if (token) {
        formData.auth.vault_refs = { token: token };
      }
    }
    
    try {
      const response = await this.callSidecarTool('sidecar.register', formData);
      
      if (response.error) {
        throw new Error(response.error.message || 'Registration failed');
      }
      
      // Close modal
      document.getElementById('register-sidecar-modal').remove();
      
      // Show success message
      this.showNotification('success', `Sidecar "${formData.name}" registered successfully`);
      
      // Refresh the list
      await this.refreshSidecars();
    } catch (error) {
      console.error('Error registering sidecar:', error);
      this.showNotification('error', `Failed to register sidecar: ${error.message}`);
    }
  }

  async refreshSidecars() {
    try {
      // Get list of registered sidecars
      const sidecarsResponse = await this.callSidecarTool('sidecar.list', {});
      
      if (sidecarsResponse.error) {
        throw new Error(sidecarsResponse.error.message);
      }
      
      this.sidecars = sidecarsResponse.adapters || [];
      
      // Update statistics
      this.updateStatistics();
      
      // Update sidecars table
      this.updateSidecarsTable();
      
      // Update sidecar filter options
      this.updateSidecarFilter();
      
      // Refresh tools
      await this.refreshSidecarTools();
      
    } catch (error) {
      console.error('Error refreshing sidecars:', error);
      this.showNotification('error', `Failed to refresh sidecars: ${error.message}`);
    }
  }

  async healthCheckAll() {
    const healthChecks = this.sidecars.map(async (sidecar) => {
      try {
        const response = await this.callSidecarTool('sidecar.health', { name: sidecar.name });
        return {
          name: sidecar.name,
          healthy: response.reachable || false,
          details: response
        };
      } catch (error) {
        return {
          name: sidecar.name,
          healthy: false,
          error: error.message
        };
      }
    });
    
    const results = await Promise.all(healthChecks);
    
    // Update sidecar statuses
    results.forEach(result => {
      const sidecar = this.sidecars.find(s => s.name === result.name);
      if (sidecar) {
        sidecar.status = result.healthy ? 'healthy' : 'unhealthy';
        sidecar.healthDetails = result.details || { error: result.error };
      }
    });
    
    this.updateSidecarsTable();
    this.updateStatistics();
    
    const healthyCount = results.filter(r => r.healthy).length;
    this.showNotification('info', `Health check complete: ${healthyCount}/${results.length} sidecars healthy`);
  }

  async refreshSidecarTools() {
    this.sidecarTools = [];
    
    for (const sidecar of this.sidecars) {
      try {
        const response = await this.callSidecarTool('sidecar.capabilities', { name: sidecar.name });
        
        if (!response.error && response.tools) {
          const tools = response.tools.map(toolName => ({
            name: toolName,
            sidecar: sidecar.name,
            system: sidecar.system || 'unknown'
          }));
          
          this.sidecarTools.push(...tools);
        }
      } catch (error) {
        console.warn(`Failed to get capabilities for ${sidecar.name}:`, error);
      }
    }
    
    this.updateToolsGrid();
  }

  updateStatistics() {
    const totalSidecars = this.sidecars.length;
    const activeSidecars = this.sidecars.filter(s => s.status === 'healthy' || s.status === 'connected').length;
    const totalTools = this.sidecarTools.length;
    const healthStatus = activeSidecars === totalSidecars ? 'All Healthy' : 
                        activeSidecars > 0 ? 'Partial' : 'Unhealthy';
    
    document.getElementById('sidecars-count').textContent = totalSidecars;
    document.getElementById('active-sidecars-count').textContent = activeSidecars;
    document.getElementById('sidecar-tools-count').textContent = totalTools;
    document.getElementById('sidecars-health-status').textContent = healthStatus;
    document.getElementById('sidecars-health-status').className = `stat-value ${healthStatus.toLowerCase().replace(' ', '-')}`;
  }

  updateSidecarsTable() {
    const tbody = document.getElementById('sidecars-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    this.sidecars.forEach(sidecar => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${sidecar.name}</strong></td>
        <td><a href="${sidecar.url}" target="_blank">${sidecar.url}</a></td>
        <td>${sidecar.transport || 'http'}</td>
        <td>
          <span class="status-badge status-${(sidecar.status || 'unknown').toLowerCase()}">
            ${sidecar.status || 'unknown'}
          </span>
        </td>
        <td>${sidecar.system || 'unknown'}</td>
        <td>${this.getSidecarToolsCount(sidecar.name)}</td>
        <td>${sidecar.last_seen ? new Date(sidecar.last_seen).toLocaleString() : 'Never'}</td>
        <td class="actions">
          <button class="btn-small secondary" onclick="sidecarManager.healthCheck('${sidecar.name}')">Health Check</button>
          <button class="btn-small secondary" onclick="sidecarManager.viewCapabilities('${sidecar.name}')">Capabilities</button>
          <button class="btn-small danger" onclick="sidecarManager.disconnectSidecar('${sidecar.name}')">Disconnect</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  updateSidecarFilter() {
    const select = document.getElementById('sidecar-filter');
    if (!select) return;
    
    // Clear existing options (except "All Sidecars")
    select.innerHTML = '<option value="">All Sidecars</option>';
    
    // Add option for each sidecar
    this.sidecars.forEach(sidecar => {
      const option = document.createElement('option');
      option.value = sidecar.name;
      option.textContent = sidecar.name;
      select.appendChild(option);
    });
  }

  updateToolsGrid() {
    const grid = document.getElementById('sidecar-tools-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const filteredTools = this.getFilteredTools();
    
    if (filteredTools.length === 0) {
      grid.innerHTML = '<p class="no-tools">No tools available. Register sidecars to see their tools.</p>';
      return;
    }
    
    filteredTools.forEach(tool => {
      const toolCard = document.createElement('div');
      toolCard.className = 'tool-card';
      toolCard.innerHTML = `
        <div class="tool-header">
          <h4>${tool.name}</h4>
          <span class="tool-sidecar">${tool.sidecar}</span>
        </div>
        <div class="tool-system">${tool.system}</div>
        <div class="tool-actions">
          <button class="btn-small primary" onclick="sidecarManager.testTool('${tool.sidecar}', '${tool.name}')">Test</button>
          <button class="btn-small secondary" onclick="sidecarManager.viewToolSchema('${tool.sidecar}', '${tool.name}')">Schema</button>
        </div>
      `;
      grid.appendChild(toolCard);
    });
  }

  getFilteredTools() {
    const sidecarFilter = document.getElementById('sidecar-filter')?.value || '';
    const searchTerm = document.getElementById('tool-search')?.value.toLowerCase() || '';
    
    return this.sidecarTools.filter(tool => {
      const matchesSidecar = !sidecarFilter || tool.sidecar === sidecarFilter;
      const matchesSearch = !searchTerm || tool.name.toLowerCase().includes(searchTerm);
      return matchesSidecar && matchesSearch;
    });
  }

  getSidecarToolsCount(sidecarName) {
    return this.sidecarTools.filter(tool => tool.sidecar === sidecarName).length;
  }

  searchTools() {
    this.updateToolsGrid();
  }

  filterTools() {
    this.updateToolsGrid();
  }

  async healthCheck(sidecarName) {
    try {
      const response = await this.callSidecarTool('sidecar.health', { name: sidecarName });
      
      const status = response.reachable ? 'healthy' : 'unhealthy';
      const message = response.reachable 
        ? `${sidecarName} is healthy (${response.system} v${response.version})`
        : `${sidecarName} is unreachable`;
      
      this.showNotification(response.reachable ? 'success' : 'error', message);
      
      // Update the sidecar status
      const sidecar = this.sidecars.find(s => s.name === sidecarName);
      if (sidecar) {
        sidecar.status = status;
        sidecar.system = response.system;
        sidecar.last_seen = new Date().toISOString();
        this.updateSidecarsTable();
        this.updateStatistics();
      }
    } catch (error) {
      this.showNotification('error', `Health check failed for ${sidecarName}: ${error.message}`);
    }
  }

  async viewCapabilities(sidecarName) {
    try {
      const response = await this.callSidecarTool('sidecar.capabilities', { name: sidecarName });
      
      const modal = `
        <div class="modal-overlay" id="capabilities-modal">
          <div class="modal-content large">
            <div class="modal-header">
              <h3>${sidecarName} Capabilities</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <div class="capabilities-info">
                <h4>System Information</h4>
                <ul>
                  <li><strong>System:</strong> ${response.system || 'Unknown'}</li>
                  <li><strong>Version:</strong> ${response.version || 'Unknown'}</li>
                  <li><strong>Webhooks:</strong> ${response.webhooks ? 'Supported' : 'Not supported'}</li>
                </ul>
                
                <h4>Available Tools (${response.tools ? response.tools.length : 0})</h4>
                <ul class="tools-list">
                  ${response.tools ? response.tools.map(tool => `<li>${tool}</li>`).join('') : '<li>No tools available</li>'}
                </ul>
                
                <h4>Rate Limits</h4>
                <pre>${JSON.stringify(response.limits || {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modal);
    } catch (error) {
      this.showNotification('error', `Failed to get capabilities: ${error.message}`);
    }
  }

  async disconnectSidecar(sidecarName) {
    if (!confirm(`Are you sure you want to disconnect ${sidecarName}?`)) {
      return;
    }
    
    try {
      const response = await this.callSidecarTool('sidecar.disconnect', { name: sidecarName });
      
      this.showNotification('success', `Disconnected from ${sidecarName}`);
      await this.refreshSidecars();
    } catch (error) {
      this.showNotification('error', `Failed to disconnect: ${error.message}`);
    }
  }

  async testTool(sidecarName, toolName) {
    // Simple test - just ping the tool
    try {
      const response = await this.callSidecarTool('sidecar.invoke', {
        name: sidecarName,
        tool: toolName,
        args: {}
      });
      
      this.showNotification('success', `Tool ${toolName} responded successfully`);
    } catch (error) {
      this.showNotification('error', `Tool test failed: ${error.message}`);
    }
  }

  async viewToolSchema(sidecarName, toolName) {
    try {
      const response = await this.callSidecarTool('sidecar.describe_tool', {
        name: sidecarName,
        tool: toolName
      });
      
      const modal = `
        <div class="modal-overlay" id="tool-schema-modal">
          <div class="modal-content large">
            <div class="modal-header">
              <h3>${toolName} Schema (${sidecarName})</h3>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
              <pre>${JSON.stringify(response.schema || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modal);
    } catch (error) {
      this.showNotification('error', `Failed to get tool schema: ${error.message}`);
    }
  }

  async callSidecarTool(toolName, args) {
    try {
      // Use the existing tools/call endpoint to invoke sidecar tools
      return await this.apiService.callTool(toolName, args);
    } catch (error) {
      console.error(`Sidecar tool call failed (${toolName}):`, error);
      throw error;
    }
  }

  showNotification(type, message) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Called when tab becomes inactive
  destroy() {
    this.stopAutoRefresh();
  }
}

// Global instance for use in onclick handlers
let sidecarManager = null;

// Initialize when the DOM is loaded
if (typeof window !== 'undefined') {
  window.SidecarManager = SidecarManager;
}