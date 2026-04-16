const express = require('express');
const productService = require('../services/ProductService');

const router = express.Router();

// 获取所有商品（前台只返回 show=1 的商品）
router.get('/', async (req, res) => {
  try {
    const all = req.query.all === '1'; // admin 用 all=1 拉全部
    const products = all ? await productService.findAll() : await productService.findVisible();
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