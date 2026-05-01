const express = require('express');
const jwt = require('jsonwebtoken');
const adminService = require('../services/adminService');
const couponService = require('../services/couponService');
const pickupService = require('../services/pickupService');
const captchaService = require('../services/captchaService');
const { login: loginLimiter } = require('../middleware/rateLimiter');
const { requireAdminAuth } = require('../middleware/auth');
const { action, system } = require('../logger');
const dataSource = require('../config/database');
const Admin = require('../entities/Admin');

const router = express.Router();

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET 环境变量未配置，请设置后重启服务');
}
const ADMIN_JWT_EXPIRES = '24h';
const ADMIN_COOKIE_NAME = 'admin_token';
const ADMIN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/api/admin',
};

const generateAdminToken = (adminId) => {
  return jwt.sign({ adminId, type: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES });
};

const auth = requireAdminAuth;

// ==================== 登录（不需要鉴权） ====================

router.post('/login', loginLimiter, captchaService.requireTurnstile(), async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const admin = await adminService.login(username, password);
    const token = generateAdminToken(admin.id);

    res.cookie(ADMIN_COOKIE_NAME, token, ADMIN_COOKIE_OPTIONS);

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        role: admin.role,
      },
    });

    // 记录管理员登录日志
    action.success('admin.login', {
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
      ip: req.ip,
    });
  } catch (error) {
    // 记录登录失败
    action.warn('admin.login.failed', {
      username,
      ip: req.ip,
      error: error.message,
    });
    res.status(401).json({ error: error.message });
  }
});

// 初始化默认管理员接口已移除 — 启动时自动初始化，无需 HTTP 暴露

// 验证 Token 是否有效
router.get('/check', auth, async (req, res) => {
  try {
    const adminRepo = dataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: req.admin.id } });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: '账号已被禁用' });
    }
    res.json({
      id: admin.id,
      username: admin.username,
      nickname: admin.nickname,
      role: admin.role,
    });
  } catch (error) {
    res.status(401).json({ error: '验证失败' });
  }
});

// 退出登录（清除 cookie）
router.post('/logout', (req, res) => {
  res.cookie(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/admin',
    maxAge: 0,
    expires: new Date(0),
  });
  res.json({ success: true });
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
});

// ==================== 以下接口全部需要鉴权 ====================

// 修改密码
router.post('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入原密码和新密码' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }
    await adminService.changePassword(req.admin.id, oldPassword, newPassword);
    res.json({ message: '密码修改成功' });

    // 记录密码修改日志
    action.success('admin.changePassword', {
      adminId: req.admin.id,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 仪表盘 ====================

router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await adminService.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 商品管理 ====================

router.get('/products', auth, async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await adminService.getProducts({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 0,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/:id', auth, async (req, res) => {
  try {
    const product = await adminService.getProduct(parseInt(req.params.id));
    if (!product) return res.status(404).json({ error: '商品不存在' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/products', auth, async (req, res) => {
  try {
    const product = await adminService.createProduct(req.body);
    res.status(201).json(product);

    action.success('admin.product.create', {
      adminId: req.admin.id,
      productId: product.id,
      productName: product.name,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/products/:id', auth, async (req, res) => {
  try {
    const product = await adminService.updateProduct(parseInt(req.params.id), req.body);
    res.json(product);

    action.success('admin.product.update', {
      adminId: req.admin.id,
      productId: product.id,
      productName: product.name,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/products/:id', auth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    await adminService.deleteProduct(productId);
    res.json({ message: '删除成功' });

    action.success('admin.product.delete', {
      adminId: req.admin.id,
      productId,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量删除商品
router.post('/products/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的商品' });
    }
    const result = await adminService.batchDeleteProducts(ids);
    res.json({ message: `成功删除 ${result} 个商品`, count: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 商品类别管理 ====================

router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await adminService.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/categories/:id', auth, async (req, res) => {
  try {
    const category = await adminService.getCategory(parseInt(req.params.id));
    if (!category) return res.status(404).json({ error: '类别不存在' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/categories', auth, async (req, res) => {
  try {
    const category = await adminService.createCategory(req.body);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/categories/:id', auth, async (req, res) => {
  try {
    const category = await adminService.updateCategory(parseInt(req.params.id), req.body);
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/categories/:id', auth, async (req, res) => {
  try {
    await adminService.deleteCategory(parseInt(req.params.id));
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量删除类别
router.post('/categories/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的类别' });
    }
    const result = await adminService.batchDeleteCategories(ids);
    res.json({ message: `成功删除 ${result} 个类别`, count: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 用户管理 ====================

router.get('/users', auth, async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await adminService.getUsers({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 0,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', auth, async (req, res) => {
  try {
    const user = await adminService.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 重置用户密码
router.put('/users/:id/reset-password', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }
    await adminService.resetUserPassword(userId, newPassword);
    res.json({ message: '密码重置成功' });

    action.success('admin.resetUserPassword', {
      targetUserId: userId,
      adminId: req.admin.id,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id/toggle-active', auth, async (req, res) => {
  try {
    const user = await adminService.toggleUserActive(parseInt(req.params.id));
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/users/:id', auth, async (req, res) => {
  try {
    await adminService.deleteUser(parseInt(req.params.id));
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量删除用户
router.post('/users/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的用户' });
    }
    const result = await adminService.batchDeleteUsers(ids);
    res.json({ message: `成功删除 ${result} 个用户`, count: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 卡密管理 ====================

// 获取卡密前缀预设
router.get('/card-prefixes', auth, async (req, res) => {
  res.json(adminService.getPrefixes());
});

// 获取卡密列表
router.get('/card-keys', auth, async (req, res) => {
  try {
    const { productId, status, page = 1, pageSize = 20 } = req.query;
    const result = await adminService.getCardKeys({
      productId: productId || '',
      status: status || '',
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量生成卡密
router.post('/card-keys/generate', auth, async (req, res) => {
  try {
    const { productId, prefix, count, cdkList, deliveryInfoList } = req.body;
    if (!productId) return res.status(400).json({ error: '请选择商品' });
    if (!count || count < 1 || count > 100) return res.status(400).json({ error: '生成数量1-100' });

    const result = await adminService.generateCardKeys(productId, prefix || '', count, cdkList || [], deliveryInfoList || []);
    res.status(201).json(result);

    action.success('admin.cardkey.generate', {
      adminId: req.admin.id,
      productId,
      prefix,
      count,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 手动录入卡密
router.post('/card-keys/manual', auth, async (req, res) => {
  try {
    const { productId, keys, cdkList, deliveryInfoList } = req.body;
    if (!productId) return res.status(400).json({ error: '请选择商品' });
    if (!keys || !Array.isArray(keys) || keys.length === 0) return res.status(400).json({ error: '请输入至少一个卡密' });
    if (keys.length > 200) return res.status(400).json({ error: '单次最多录入200个' });

    const result = await adminService.manualAddCardKeys(productId, keys, cdkList || [], deliveryInfoList || []);
    res.status(201).json(result);

    action.success('admin.cardkey.manualAdd', {
      adminId: req.admin.id,
      productId,
      count: keys.length,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新卡密
router.put('/card-keys/:id', auth, async (req, res) => {
  try {
    const cardKey = await adminService.updateCardKey(parseInt(req.params.id), req.body);
    res.json(cardKey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除卡密
router.delete('/card-keys/:id', auth, async (req, res) => {
  try {
    const cardKeyId = parseInt(req.params.id);
    await adminService.deleteCardKey(cardKeyId);
    res.json({ message: '删除成功' });

    action.success('admin.cardkey.delete', {
      adminId: req.admin.id,
      cardKeyId,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量删除卡密
router.post('/card-keys/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的卡密' });
    }
    if (ids.length > 500) {
      return res.status(400).json({ error: '单次最多删除500条' });
    }
    const result = await adminService.batchDeleteCardKeys(ids);
    res.json({ message: `成功删除 ${result} 条卡密`, count: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 订单管理 ====================

router.get('/orders', auth, async (req, res) => {
  try {
    const { status, userId, payMethod, orderNo, cardCode, page = 1, pageSize = 20 } = req.query;
    const result = await adminService.getOrders({
      status: status || '',
      userId: userId ? parseInt(userId) : null,
      payMethod: payMethod || '',
      orderNo: (orderNo || '').trim() || null,
      cardCode: (cardCode || '').trim() || null,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/orders/:id', auth, async (req, res) => {
  try {
    await adminService.deleteOrder(parseInt(req.params.id));
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量删除订单
router.post('/orders/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的订单' });
    }
    const result = await adminService.batchDeleteOrders(ids);
    res.json({ message: `成功删除 ${result} 条订单`, count: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 接码记录 ====================

router.get('/sms-records', auth, async (req, res) => {
  try {
    const { status, phone, keyword, source, page = 1, pageSize = 20 } = req.query;
    const result = await pickupService.querySmsRecords({
      status: status || '',
      phone: phone || '',
      keyword: keyword || '',
      source: source || '',
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量删除接码记录
router.post('/sms-records/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的记录' });
    }
    const result = await pickupService.batchDeleteSmsRecords(ids);
    res.json({ message: `成功删除 ${result} 条记录`, count: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 优惠码管理 ====================

// 获取优惠码列表
router.get('/coupons', auth, async (req, res) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const result = await couponService.getCoupons({
      status: status || '',
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建优惠码
router.post('/coupons', auth, async (req, res) => {
  try {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json(coupon);

    action.success('admin.coupon.create', {
      adminId: req.admin.id,
      couponId: coupon.id,
      code: coupon.code,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量生成优惠码
router.post('/coupons/generate', auth, async (req, res) => {
  try {
    const result = await couponService.generateCoupons(req.body);
    res.status(201).json(result);

    action.success('admin.coupon.generate', {
      adminId: req.admin.id,
      count: result.length,
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新优惠码
router.put('/coupons/:id', auth, async (req, res) => {
  try {
    const coupon = await couponService.updateCoupon(parseInt(req.params.id), req.body);
    res.json(coupon);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除优惠码
router.delete('/coupons/:id', auth, async (req, res) => {
  try {
    await couponService.deleteCoupon(parseInt(req.params.id));
    res.json({ message: '删除成功' });

    action.success('admin.coupon.delete', {
      adminId: req.admin.id,
      couponId: parseInt(req.params.id),
      ip: req.ip,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 批量删除优惠码
router.post('/coupons/batch-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请选择要删除的优惠码' });
    }
    const result = await couponService.batchDeleteCoupons(ids);
    res.json({ message: `成功删除 ${result} 个优惠码`, count: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 管理员管理 ====================

router.get('/admins', auth, async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await adminService.findAllAdmins({
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 0,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admins', auth, async (req, res) => {
  try {
    const admin = await adminService.createAdmin(req.body);
    res.status(201).json(admin);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/admins/:id', auth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    // 不允许删除自己
    if (targetId === req.admin.id) {
      return res.status(400).json({ error: '不能删除自己的账号' });
    }
    await adminService.deleteAdmin(targetId);
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
