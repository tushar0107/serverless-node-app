const originalAccepts = require('accepts');

/**
 * Wrapper for the Accepts constructor with input validation
 * 
 * @param {object} req - The request object
 * @returns {object} Accepts instance
 */
function validatedAccepts(req) {
  // Add validation check before passing to the original Accepts
  if (!req || typeof req !== 'object' || !req.headers) {
    throw new Error('Invalid request object: req must be an object with headers property');
  }
  
  return originalAccepts(req);
}

module.exports = validatedAccepts;