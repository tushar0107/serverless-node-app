const express = require('express');
const serverless = require('serverless-http');
const validatedAccepts = require('./acceptsWrapper');

const authRoutes = require('../routes/auth');
const productRoutes = require('../routes/products');

// Override the express.request.accepts method to use our validated version
express.request.accepts = function(...args) {
  return validatedAccepts(this).types(...args);
};

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Add middleware to validate request object structure
app.use((req, res, next) => {
  if (!req || typeof req !== 'object' || !req.headers) {
    return res.status(400).json({ error: 'Invalid request object' });
  }
  next();
});

// Mount routes WITHOUT prefix to avoid doubling /api
app.use('/.netlify/functions/api/',authRoutes);
app.use('/.netlify/functions/api/',productRoutes);

module.exports.handler = serverless(app);
