/**
 * Backup Manager for OPAL Admin Panel
 * Handles database backup and restore operations
 */

// Only define if not already defined
window.BackupManager = window.BackupManager || {
  init() {
    this.setupCreateButton();
    this.loadBackups();
  },
  
  async loadBackups() {
    try {
      // Show loading indicator
      document.getElementById('backups-list').innerHTML = '<tr><td colspan="4">Loading backups...</td></tr>';
      
      const backups = await ApiService.backups.getAll();
      this.renderBackups(backups);
    } catch (error) {
      console.error('Failed to load backups:', error);
      document.getElementById('backups-list').innerHTML = '<tr><td colspan="4">Error loading backups: ' + error.message + '</td></tr>';
    }
  },
  
  renderBackups(backups) {
    const container = document.getElementById('backups-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!backups || backups.length === 0) {
      container.innerHTML = '<tr><td colspan="4">No backups found</td></tr>';
      return;
    }
    
    backups.forEach(backup => {
      const row = document.createElement('tr');
      const size = (backup.size / (1024 * 1024)).toFixed(2) + ' MB';
      
      row.innerHTML = `
        <td>${this.escapeHtml(backup.filename)}</td>
        <td>${new Date(backup.timestamp).toLocaleString()}</td>
        <td>${size}</td>
        <td>
          <button class="restore-backup" data-filename="${backup.filename}">Restore</button>
          <button class="delete-backup danger" data-filename="${backup.filename}">Delete</button>
        </td>
      `;
      
      container.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.restore-backup').forEach(button => {
      button.addEventListener('click', async (e) => {
        const filename = e.target.getAttribute('data-filename');
        if (confirm('Are you sure you want to restore this backup? This will overwrite the current database.')) {
          try {
            // Show loading indicator
            e.target.innerHTML = '<span class="spinner"></span> Restoring...';
            e.target.disabled = true;
            
            await ApiService.backups.restore(filename);
            
            alert('Backup restored successfully. The page will now reload.');
            window.location.reload();
          } catch (error) {
            alert('Failed to restore backup: ' + error.message);
            e.target.innerHTML = 'Restore';
            e.target.disabled = false;
          }
        }
      });
    });
    
    document.querySelectorAll('.delete-backup').forEach(button => {
      button.addEventListener('click', async (e) => {
        const filename = e.target.getAttribute('data-filename');
        if (confirm('Are you sure you want to delete this backup?')) {
          try {
            // Show loading indicator
            e.target.innerHTML = '<span class="spinner"></span> Deleting...';
            e.target.disabled = true;
            
            await ApiService.backups.delete(filename);
            this.loadBackups();
          } catch (error) {
            alert('Failed to delete backup: ' + error.message);
            e.target.innerHTML = 'Delete';
            e.target.disabled = false;
          }
        }
      });
    });
  },
  
  setupCreateButton() {
    const createButton = document.getElementById('create-backup-button');
    if (createButton) {
      createButton.addEventListener('click', async () => {
        const name = prompt('Enter a name for the backup (optional):');
        
        try {
          // Show loading indicator
          createButton.innerHTML = '<span class="spinner"></span> Creating Backup...';
          createButton.disabled = true;
          
          await ApiService.backups.create(name || '');
          
          // Reset button
          createButton.innerHTML = 'Create Backup';
          createButton.disabled = false;
          
          this.loadBackups();
        } catch (error) {
          alert('Failed to create backup: ' + error.message);
          
          // Reset button
          createButton.innerHTML = 'Create Backup';
          createButton.disabled = false;
        }
      });
    }
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export the module
window.BackupManager = BackupManager;
