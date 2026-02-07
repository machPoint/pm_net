/**
 * Dark Mode functionality for OPAL Admin Panel
 */

document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  
  if (darkModeToggle) {
    // Check for saved preference
    const savedDarkMode = localStorage.getItem('opal_dark_mode');
    
    // Apply dark mode if saved preference exists
    if (savedDarkMode === 'true') {
      document.body.classList.add('dark-mode');
      updateToggleIcon(true);
    }
    
    // Add click event listener
    darkModeToggle.addEventListener('click', () => {
      const isDarkMode = document.body.classList.toggle('dark-mode');
      localStorage.setItem('opal_dark_mode', isDarkMode);
      updateToggleIcon(isDarkMode);
    });
  }
});

/**
 * Update the dark mode toggle icon based on current state
 * @param {boolean} isDarkMode - Whether dark mode is active
 */
function updateToggleIcon(isDarkMode) {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  
  if (darkModeToggle) {
    // Update the icon - moon for dark mode, sun for light mode
    if (isDarkMode) {
      darkModeToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `;
      darkModeToggle.title = "Switch to Light Mode";
    } else {
      darkModeToggle.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      darkModeToggle.title = "Switch to Dark Mode";
    }
  }
}
