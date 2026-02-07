/**
 * Token Manager for OPAL Admin Panel
 * Handles API token operations
 */

// Only define if not already defined
window.TokenManager = window.TokenManager || {
  init() {
    console.log('TokenManager.init() called');
    this.setupCreateForm();
    this.loadTokens();
  },
  
  async loadTokens() {
    try {
      // Show loading indicator
      document.getElementById('tokens-list').innerHTML = '<tr><td colspan="5">Loading tokens...</td></tr>';
      
      const tokens = await ApiService.apiTokens.getAll();
      this.renderTokens(tokens);
    } catch (error) {
      console.error('Failed to load tokens:', error);
      document.getElementById('tokens-list').innerHTML = '<tr><td colspan="5">Error loading tokens: ' + error.message + '</td></tr>';
    }
  },
  
  renderTokens(tokens) {
    const container = document.getElementById('tokens-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!tokens || tokens.length === 0) {
      container.innerHTML = '<tr><td colspan="5">No API tokens found</td></tr>';
      return;
    }
    
    tokens.forEach(token => {
      const row = document.createElement('tr');
      // Handle permissions that might be a string or already an object
      let permissions;
      try {
        // Try to parse if it's a JSON string
        permissions = typeof token.permissions === 'string' ? JSON.parse(token.permissions || '{}') : (token.permissions || {});
      } catch (e) {
        // If parsing fails, treat it as a comma-separated string
        permissions = token.permissions ? token.permissions.split(',').reduce((obj, perm) => {
          obj[perm.trim()] = true;
          return obj;
        }, {}) : {};
      }
      const expires = token.expires_at ? new Date(token.expires_at).toLocaleString() : 'Never';
      
      row.innerHTML = `
        <td>${this.escapeHtml(token.name)}</td>
        <td>${token.token.substring(0, 8)}...</td>
        <td>${typeof permissions === 'string' ? permissions : Object.keys(permissions).filter(k => permissions[k]).join(', ') || 'None'}</td>
        <td>${expires}</td>
        <td>
          <button class="delete-token danger" data-id="${token.id}">Delete</button>
        </td>
      `;
      
      container.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.delete-token').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this token?')) {
          try {
            // Don't parse the ID as an integer since it's a UUID string
            await ApiService.apiTokens.delete(id);
            this.loadTokens();
          } catch (error) {
            console.error('Error deleting token:', error);
            alert('Failed to delete token: ' + error.message);
          }
        }
      });
    });
  },
  
  setupCreateForm() {
    const createButton = document.getElementById('create-token-button');
    
    if (createButton) {
      createButton.addEventListener('click', () => {
        // Simple approach - prompt for token name
        const name = prompt('Enter a name for the API token:');
        if (!name || !name.trim()) return;
        
        // Default permissions
        const permissions = {
          read: true,
          write: false,
          admin: false
        };
        
        // Default expiry - 30 days
        const expiresIn = 30;
        
        // Create token
        createButton.innerHTML = '<span class="spinner"></span> Creating Token...';
        createButton.disabled = true;
        
        ApiService.apiTokens.create({ name, permissions, expiresIn })
          .then(result => {
            if (result && result.token) {
              // Show token in a modal with copy button instead of an alert
              this.showTokenModal(result.token);
            }
            this.loadTokens();
            createButton.innerHTML = 'Create Token';
            createButton.disabled = false;
          })
          .catch(error => {
            alert('Failed to create token: ' + error.message);
            createButton.innerHTML = 'Create Token';
            createButton.disabled = false;
          });
      });
    }
    
    // Close modal when clicking the close button
    document.querySelector('.close-token-modal').addEventListener('click', () => {
      document.getElementById('token-modal').style.display = 'none';
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('token-modal');
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Handle form submission
    document.getElementById('token-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('token-name').value;
      const expiresIn = parseInt(document.getElementById('token-expiry').value, 10);
      
      // Get permissions
      const permissions = {
        read: document.getElementById('perm-read').checked,
        write: document.getElementById('perm-write').checked,
        admin: document.getElementById('perm-admin').checked
      };
      
      // Validate form
      if (!name.trim()) {
        alert('Token name is required');
        return;
      }
      
      try {
        const result = await ApiService.tokens.create(name, permissions, expiresIn);
        
        // Show the token to the user
        if (result && result.token) {
          const tokenDisplay = document.getElementById('new-token-display');
          tokenDisplay.textContent = result.token;
          document.getElementById('new-token-container').style.display = 'block';
          
          // Copy to clipboard button
          document.getElementById('copy-token-button').addEventListener('click', () => {
            navigator.clipboard.writeText(result.token)
              .then(() => alert('Token copied to clipboard!'))
              .catch(err => console.error('Failed to copy token:', err));
          });
        }
        
        // Refresh token list
        this.loadTokens();
      } catch (error) {
        alert('Failed to create token: ' + error.message);
      }
    });
    
    // Close new token display
    document.getElementById('close-token-display').addEventListener('click', () => {
      document.getElementById('new-token-container').style.display = 'none';
      document.getElementById('token-modal').style.display = 'none';
    });
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  // Show token in a modal dialog with copy button
  showTokenModal(token) {
    // Create modal container if it doesn't exist
    let modal = document.getElementById('token-display-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'token-display-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Your New API Token</h3>
            <span class="close-modal">&times;</span>
          </div>
          <div class="modal-body">
            <p class="warning">Save this token now. You won't be able to see it again!</p>
            <div class="token-display">
              <input type="text" id="token-value" readonly />
              <button id="copy-token-button" class="copy-button">Copy</button>
            </div>
          </div>
          <div class="modal-footer">
            <button id="close-token-modal-button" class="success">Done</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Add event listeners for the modal
      const closeBtn = modal.querySelector('.close-modal');
      const closeButton = modal.querySelector('#close-token-modal-button');
      const copyButton = modal.querySelector('#copy-token-button');
      
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      copyButton.addEventListener('click', () => {
        const tokenInput = document.getElementById('token-value');
        tokenInput.select();
        document.execCommand('copy');
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
          copyButton.textContent = 'Copy';
        }, 2000);
      });
      
      // Close when clicking outside the modal
      window.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
    
    // Set the token value in the input field
    const tokenInput = document.getElementById('token-value');
    tokenInput.value = token;
    
    // Show the modal
    modal.style.display = 'block';
  }
};

// Export the module
window.TokenManager = TokenManager;
