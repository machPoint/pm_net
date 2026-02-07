/**
 * Audit Manager for OPAL Admin Panel
 * Handles tool run audit logs and statistics
 */

// Only define if not already defined
window.AuditManager = window.AuditManager || {
  init() {
    this.setupFilterForm();
    this.loadToolRuns();
    this.loadStats();
  },
  
  async loadToolRuns(limit = 50, offset = 0, filters = {}) {
    try {
      // Show loading indicator
      document.getElementById('tool-runs-list').innerHTML = '<tr><td colspan="5">Loading audit logs...</td></tr>';
      
      const toolRuns = await ApiService.toolRuns.getAll(limit, offset, filters);
      this.renderToolRuns(toolRuns);
    } catch (error) {
      console.error('Failed to load tool runs:', error);
      document.getElementById('tool-runs-list').innerHTML = '<tr><td colspan="5">Error loading audit logs: ' + error.message + '</td></tr>';
    }
  },
  
  async loadStats() {
    try {
      const stats = await ApiService.toolRuns.getStats();
      this.renderStats(stats);
    } catch (error) {
      console.error('Failed to load tool run stats:', error);
    }
  },
  
  renderToolRuns(toolRuns) {
    const container = document.getElementById('tool-runs-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!toolRuns || toolRuns.length === 0) {
      container.innerHTML = '<tr><td colspan="5">No tool runs found</td></tr>';
      return;
    }
    
    toolRuns.forEach(run => {
      const row = document.createElement('tr');
      const parameters = JSON.parse(run.parameters || '{}');
      const result = run.result ? JSON.parse(run.result) : null;
      const duration = run.duration_ms ? `${run.duration_ms}ms` : 'N/A';
      
      row.innerHTML = `
        <td>${this.escapeHtml(run.tool_name)}</td>
        <td>${this.formatJson(parameters)}</td>
        <td>${run.status}</td>
        <td>${duration}</td>
        <td>${new Date(run.executed_at).toLocaleString()}</td>
      `;
      
      // Add class based on status
      if (run.status === 'failed') {
        row.classList.add('error-row');
      } else if (run.status === 'completed') {
        row.classList.add('success-row');
      }
      
      container.appendChild(row);
      
      // Add click event to show details
      row.addEventListener('click', () => {
        this.showToolRunDetails(run);
      });
    });
  },
  
  renderStats(stats) {
    const statsContainer = document.getElementById('tool-run-stats');
    if (!statsContainer || !stats) return;
    
    // Total runs
    const totalRuns = stats.totalRuns || 0;
    document.getElementById('total-runs').textContent = totalRuns;
    
    // Success rate
    const successRate = stats.successRate !== undefined ? (stats.successRate * 100).toFixed(1) + '%' : 'N/A';
    document.getElementById('success-rate').textContent = successRate;
    
    // Average duration
    const avgDuration = stats.averageDuration !== undefined ? `${stats.averageDuration.toFixed(2)}ms` : 'N/A';
    document.getElementById('avg-duration').textContent = avgDuration;
    
    // Most used tools
    const topToolsContainer = document.getElementById('top-tools');
    if (topToolsContainer && stats.topTools && stats.topTools.length > 0) {
      topToolsContainer.innerHTML = '';
      
      stats.topTools.forEach(tool => {
        const item = document.createElement('div');
        item.classList.add('stat-item');
        item.innerHTML = `
          <span class="tool-name">${this.escapeHtml(tool.name)}</span>
          <span class="tool-count">${tool.count}</span>
        `;
        topToolsContainer.appendChild(item);
      });
    } else if (topToolsContainer) {
      topToolsContainer.innerHTML = '<div class="stat-item">No data available</div>';
    }
  },
  
  showToolRunDetails(run) {
    // Set modal title
    document.getElementById('tool-run-modal-title').textContent = `Tool Run: ${run.tool_name}`;
    
    // Format parameters and result
    const parameters = JSON.parse(run.parameters || '{}');
    const result = run.result ? JSON.parse(run.result) : null;
    
    document.getElementById('tool-run-parameters').textContent = JSON.stringify(parameters, null, 2);
    document.getElementById('tool-run-result').textContent = result ? JSON.stringify(result, null, 2) : 'No result data';
    
    // Set status and metadata
    document.getElementById('tool-run-status').textContent = run.status;
    document.getElementById('tool-run-status').className = run.status === 'completed' ? 'status-success' : 'status-error';
    
    document.getElementById('tool-run-duration').textContent = run.duration_ms ? `${run.duration_ms}ms` : 'N/A';
    document.getElementById('tool-run-timestamp').textContent = new Date(run.executed_at).toLocaleString();
    document.getElementById('tool-run-user').textContent = run.user_id || 'Unknown';
    
    // Show modal
    document.getElementById('tool-run-modal').style.display = 'block';
  },
  
  setupFilterForm() {
    const filterButton = document.getElementById('filter-tool-runs-button');
    const toolNameInput = document.getElementById('filter-tool-name');
    const statusSelect = document.getElementById('filter-status');
    const dateFromInput = document.getElementById('filter-date-from');
    const dateToInput = document.getElementById('filter-date-to');
    
    if (filterButton) {
      filterButton.addEventListener('click', () => {
        const filters = {};
        
        if (toolNameInput && toolNameInput.value.trim()) {
          filters.toolName = toolNameInput.value.trim();
        }
        
        if (statusSelect && statusSelect.value) {
          filters.status = statusSelect.value;
        }
        
        if (dateFromInput && dateFromInput.value) {
          filters.dateFrom = new Date(dateFromInput.value).toISOString();
        }
        
        if (dateToInput && dateToInput.value) {
          filters.dateTo = new Date(dateToInput.value).toISOString();
        }
        
        this.loadToolRuns(50, 0, filters);
      });
    }
    
    // Reset filters button
    const resetButton = document.getElementById('reset-tool-runs-button');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        if (toolNameInput) toolNameInput.value = '';
        if (statusSelect) statusSelect.value = '';
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
        
        this.loadToolRuns();
      });
    }
    
    // Close modal when clicking the close button
    const closeButton = document.querySelector('.close-tool-run-modal');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        const modal = document.getElementById('tool-run-modal');
        if (modal) modal.style.display = 'none';
      });
    }
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('tool-run-modal');
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  },
  
  formatJson(obj) {
    if (!obj) return 'None';
    
    // For simple display in table, just show keys
    const keys = Object.keys(obj);
    if (keys.length === 0) return 'Empty';
    
    return keys.map(k => `${k}: ${typeof obj[k] === 'object' ? '{ ... }' : this.truncateText(String(obj[k]), 20)}`).join(', ');
  },
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
};

// Export the module
window.AuditManager = AuditManager;
