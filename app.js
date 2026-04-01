const express = require('express');
const path = require('path');

const app = express();
const PORT = 5100;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 简单商品数据
const products = [
  { id: 1, name: '手工皂', price: 28, description: '纯天然手工制作' },
  { id: 2, name: '蜂蜜', price: 68, description: '深山野生蜂蜜' },
  { id: 3, name: '茶叶', price: 88, description: '高山有机绿茶' },
];

// API 路由
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: '商品不存在' });
  res.json(product);
});

// 主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🛒 在线商品小站已启动: http://localhost:${PORT}`);
});