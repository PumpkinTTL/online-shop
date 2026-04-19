const express = require('express');
const captchaService = require('../services/captchaService');
const { system } = require('../logger');

const router = express.Router();

// 获取验证码
router.get('/', (req, res) => {
  try {
    const captcha = captchaService.generate();
    res.json(captcha);
  } catch (error) {
    system.error('生成验证码失败', { error: error.message });
    res.status(500).json({ error: '生成验证码失败' });
  }
});

// 校验验证码
router.post('/verify', (req, res) => {
  try {
    const { captchaId, answer } = req.body;
    if (!captchaId || answer === undefined || answer === null) {
      return res.status(400).json({ error: '请提供验证码ID和答案' });
    }

    const valid = captchaService.verify(captchaId, String(answer).trim());
    if (!valid) {
      return res.status(400).json({ error: '验证码错误或已过期' });
    }

    // 验证通过，设置签名cookie（10分钟有效）
    const token = captchaService.generateVerifiedToken();
    res.cookie('captcha_verified', token, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, // 10分钟
    });

    res.json({ success: true });
  } catch (error) {
    system.error('校验验证码失败', { error: error.message });
    res.status(500).json({ error: '校验验证码失败' });
  }
});

module.exports = router;
