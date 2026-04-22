const express = require('express');
const captchaService = require('../services/captchaService');
const limiters = require('../middleware/rateLimiter');
const { system } = require('../logger');

const router = express.Router();

// 验证码接口独立限流（10次/分钟，防止刷验证码）
router.use(limiters.captcha);

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

    // 验证通过：重置该 IP 在所有限流器上的计数器
    // 不设 cookie/豁免期，计数器从 0 开始重新计算
    // 继续频繁操作会再次触发限流
    const clientIp = req.ip || req.connection?.remoteAddress;
    limiters.resetAllKeys(clientIp);

    res.json({ success: true });
  } catch (error) {
    system.error('校验验证码失败', { error: error.message });
    res.status(500).json({ error: '校验验证码失败' });
  }
});

module.exports = router;
