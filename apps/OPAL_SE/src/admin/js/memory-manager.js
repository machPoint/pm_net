/**
 * Memory Manager for OPAL Admin Panel
 * Handles memory creation, editing, and deletion
 */

// Only define if not already defined
window.MemoryManager = window.MemoryManager || {
  init() {
    this.setupSearchForm();
    this.setupCreateForm();
    this.setupMemoryModal();
    this.loadMemories();
  },
  
  async loadMemories(limit = 50, offset = 0) {
    try {
      // Show loading indicator
      document.getElementById('memories-list').innerHTML = '<tr><td colspan="4">Loading memories...</td></tr>';
      
      const memories = await ApiService.memories.getAll(limit, offset);
      this.renderMemories(memories);
    } catch (error) {
      console.error('Failed to load memories:', error);
      document.getElementById('memories-list').innerHTML = '<tr><td colspan="4">Error loading memories: ' + error.message + '</td></tr>';
    }
  },
  
  renderMemories(memories) {
    const container = document.getElementById('memories-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!memories || memories.length === 0) {
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
          <button class="delete-memory danger" data-id="${memory.id}">Delete</button>
        </td>
      `;
      
      container.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-memory').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        await this.showEditForm(id);
      });
    });
    
    document.querySelectorAll('.delete-memory').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this memory?')) {
          try {
            await ApiService.memories.delete(id);
            this.loadMemories();
          } catch (error) {
            alert('Failed to delete memory: ' + error.message);
          }
        }
      });
    });
  },
  
  setupSearchForm() {
    const searchButton = document.getElementById('search-memory-button');
    const searchInput = document.getElementById('memory-search');
    
    if (searchButton && searchInput) {
      // Search on button click
      searchButton.addEventListener('click', async () => {
        const query = searchInput.value;
        if (query.trim()) {
          try {
            const results = await ApiService.memories.search(query);
            this.renderMemories(results);
          } catch (error) {
            console.error('Search failed:', error);
            alert('Search failed: ' + error.message);
          }
        } else {
          this.loadMemories();
        }
      });
      
      // Search on Enter key
      searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          searchButton.click();
        }
      });
    }
  },
  
  setupCreateForm() {
    const createButton = document.getElementById('create-memory-button');
    
    if (createButton) {
      createButton.addEventListener('click', () => {
        // Reset form
        document.getElementById('memory-form').reset();
        document.getElementById('memory-form-title').textContent = 'Create New Memory';
        document.getElementById('memory-id').value = '';
        
        // Show modal
        document.getElementById('memory-modal').style.display = 'block';
      });
    }
  },
  
  setupMemoryModal() {
    // Close modal when clicking the close button
    document.querySelector('.close-memory-modal').addEventListener('click', () => {
      document.getElementById('memory-modal').style.display = 'none';
    });
    
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('memory-modal');
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Handle form submission
    document.getElementById('memory-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('memory-id').value;
      const title = document.getElementById('memory-title').value;
      const content = document.getElementById('memory-content').value;
      const metadataStr = document.getElementById('memory-metadata').value;
      
      // Validate form
      if (!title.trim() || !content.trim()) {
        alert('Title and content are required');
        return;
      }
      
      // Parse metadata JSON
      let metadata = {};
      try {
        if (metadataStr.trim()) {
          metadata = JSON.parse(metadataStr);
        }
      } catch (error) {
        alert('Invalid metadata JSON: ' + error.message);
        return;
      }
      
      try {
        if (id) {
          // Update existing memory
          await ApiService.memories.update(id, { title, content, metadata });
        } else {
          // Create new memory
          await ApiService.memories.create(title, content, metadata);
        }
        
        // Close modal and refresh memories
        document.getElementById('memory-modal').style.display = 'none';
        this.loadMemories();
      } catch (error) {
        alert('Failed to save memory: ' + error.message);
      }
    });
  },
  
  async showEditForm(id) {
    try {
      // Fetch memory details
      const memory = await ApiService.memories.getById(id);
      
      if (!memory) {
        alert('Memory not found');
        return;
      }
      
      // Populate form
      document.getElementById('memory-form-title').textContent = 'Edit Memory';
      document.getElementById('memory-id').value = memory.id;
      document.getElementById('memory-title').value = memory.title;
      document.getElementById('memory-content').value = memory.content;
      
      // Parse and format metadata
      let metadata = {};
      try {
        metadata = JSON.parse(memory.metadata || '{}');
      } catch (error) {
        console.error('Failed to parse metadata:', error);
      }
      
      document.getElementById('memory-metadata').value = JSON.stringify(metadata, null, 2);
      
      // Show modal
      document.getElementById('memory-modal').style.display = 'block';
    } catch (error) {
      alert('Failed to load memory: ' + error.message);
    }
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

// Export the module
window.MemoryManager = MemoryManager;
