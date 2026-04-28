const express = require('express');
const { body, param, validationResult } = require('express-validator');
const rateLimitService = require('../services/rateLimitService');
const { requireAdminAuth } = require('../middleware/auth');
const { refreshConfigs } = require('../middleware/rateLimiter');

const auth = requireAdminAuth;
const router = express.Router();

// 验证中间件：统一处理验证错误
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// 获取所有速率限制配置（需要管理员权限）
router.get('/', auth, async (req, res) => {
  try {
    const configs = await rateLimitService.findAll();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单个速率限制配置（需要管理员权限）
router.get('/:key', auth, async (req, res) => {
  try {
    const config = await rateLimitService.getEffectiveConfig(req.params.key);
    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新速率限制配置（需要管理员权限）
router.put('/:key', [
  param('key')
    .isIn(['global', 'login', 'payment', 'api', 'admin', 'pickup', 'pickupVerify', 'pickupRedeem', 'captcha'])
    .withMessage('无效的配置键'),
  body('windowMs')
    .optional()
    .isInt({ min: 1000 })
    .withMessage('时间窗口必须是大于等于1000的整数毫秒值'),
  body('maxRequests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('最大请求数必须是大于等于1的整数'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled必须是布尔值'),
  body('message')
    .optional()
    .isString()
    .withMessage('message必须是字符串')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('message长度必须在1-200字符之间'),
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { key } = req.params;
    const { windowMs, maxRequests, message, enabled } = req.body;

    const data = {};
    if (windowMs !== undefined) data.windowMs = windowMs;
    if (maxRequests !== undefined) data.maxRequests = maxRequests;
    if (message !== undefined) data.message = message;
    if (enabled !== undefined) data.enabled = enabled;

    const config = await rateLimitService.updateByKey(key, data);

    // 立即刷新限速器配置（无需重启服务器）
    await refreshConfigs();

    res.json({
      message: '配置更新成功',
      config,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 重置为默认配置（需要管理员权限）
router.post('/reset', auth, async (req, res) => {
  try {
    const configs = await rateLimitService.resetToDefaults();

    // 立即刷新限速器配置（无需重启服务器）
    await refreshConfigs();

    res.json({
      message: '配置已重置为默认值',
      configs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
