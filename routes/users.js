const express = require('express');
const userService = require('../services/UserService');

const router = express.Router();

// 获取所有用户
router.get('/', async (req, res) => {
  try {
    const users = await userService.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个用户
router.get('/:id', async (req, res) => {
  try {
    const user = await userService.findOne(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;