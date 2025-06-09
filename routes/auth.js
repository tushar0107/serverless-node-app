const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => res.json({ message: 'Logged in!' }));
router.post('/register', (req, res) => res.json({ message: 'Registered!' }));

module.exports = router;
