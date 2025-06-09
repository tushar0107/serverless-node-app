const express = require('express');
const router = express.Router();

router.get('/get-products', (req, res) => {
  res.json({
    products: [
      { id: 1, name: 'T-shirt' },
      { id: 2, name: 'Jeans' }
    ]
  });
});

module.exports = router;
