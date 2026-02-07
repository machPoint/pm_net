/**
 * OPAL Server Configuration
 * Handles configuration values with backward compatibility for MachPoint naming
 */

// Mode configuration (persistent or ephemeral)
const MODE = process.env.OPAL_MODE || process.env.MACHPOINT_MODE || 'persistent';

// Ephemeral timeout in milliseconds
const EPHEMERAL_TIMEOUT = parseInt(
  process.env.OPAL_EPHEMERAL_TIMEOUT || 
  process.env.MACHPOINT_EPHEMERAL_TIMEOUT || 
  '1800000', 
  10
);

// Server image name
const OPAL_SERVER_IMAGE = "opal-server:latest";

// Export configuration values
module.exports = {
  MODE,
  EPHEMERAL_TIMEOUT,
  OPAL_SERVER_IMAGE,
  
  // Helper function to determine if the server is in ephemeral mode
  isEphemeral: () => MODE.toLowerCase() === 'ephemeral',
  
  // Helper function to determine if the server is in persistent mode
  isPersistent: () => MODE.toLowerCase() === 'persistent' || MODE.toLowerCase() !== 'ephemeral'
};
