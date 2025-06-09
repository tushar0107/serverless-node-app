const express = require('express');
const serverless = require('serverless-http');

const authRoutes = require('../routes/auth');
const productRoutes = require('../routes/products');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Mount routes WITHOUT prefix to avoid doubling /api
app.use('/.netlify/functions/api/',authRoutes);
app.use('/.netlify/functions/api/',productRoutes);

module.exports.handler = serverless(app);
