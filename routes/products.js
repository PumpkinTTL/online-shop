const express = require('express');
const productService = require('../services/ProductService');

const router = express.Router();

// 获取所有商品
router.get('/', async (req, res) => {
  try {
    const products = await productService.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个商品
router.get('/:id', async (req, res) => {
  try {
    const product = await productService.findOne(parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;