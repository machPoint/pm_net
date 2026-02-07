/**
 * Tab Navigation for OPAL Admin Panel
 * Handles tab switching functionality
 */

// Initialize tab navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
});

// Initialize tab navigation
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Hide all tab contents
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Show the corresponding tab content
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}
