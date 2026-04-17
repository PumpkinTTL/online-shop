const express = require('express');
const jwt = require('jsonwebtoken');
const adminService = require('../services/adminService');
const pickupService = require('../services/pickupService');
const { login: loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// JWT 配置（后台独立密钥，与前台用户区分）
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
if (!ADMIN_JWT_SECRET) {
  throw new Error('ADMIN_JWT_SECRET 环境变量未配置，请设置后重启服务');
}
const ADMIN_JWT_EXPIRES = '24h';

// 生成 Token
const generateAdminToken = (adminId) => {
  return jwt.sign({ adminId, type: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES });
};

const dataSource = require('../config/database');
const Admin = require('../entities/Admin');

// ==================== 鉴权中间件 ====================

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录，请先登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    // 确认是 admin 类型的 token（防止前台用户 token 越权）
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: '无权限访问' });
    }

    // 检查管理员是否存在且未被禁用
    const adminRepo = dataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: decoded.adminId } });
    if (!admin) {
      return res.status(401).json({ error: '管理员不存在' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    req.admin = { id: decoded.adminId, role: admin.role };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的认证信息' });
  }
};

// ==================== 登录（不需要鉴权） ====================

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const admin = await adminService.login(username, password);
    const token = generateAdminToken(admin.id);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        nickname: admin.nickname,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// 初始化默认管理员（不需要鉴权，仅首次使用）
router.post('/init', async (req, res) => {
  try {
    const result = await adminService.initDefaultAdmin();
    if (!result) {
      return res.status(400).json({ error: '管理员已存在' });
    }
    res.json({ message: '初始化成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 验证 Token 是否有效
router.get('/check', auth, async (req, res) => {
  try {
    const adminRepo = dataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: req.admin.id } });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: '账号已禁用' });
    }
    const { password, ...info } = admin;
    res.json(info);
  } catch (error) {
    res.status(401).json({ error: '无效' });
  }
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
    const products = await adminService.getProducts();
    res.json(products);
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
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/products/:id', auth, async (req, res) => {
  try {
    const product = await adminService.updateProduct(parseInt(req.params.id), req.body);
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/products/:id', auth, async (req, res) => {
  try {
    await adminService.deleteProduct(parseInt(req.params.id));
    res.json({ message: '删除成功' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ==================== 用户管理 ====================

router.get('/users', auth, async (req, res) => {
  try {
    const users = await adminService.getUsers();
    res.json(users);
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
    const { productId, prefix, count, cdkList } = req.body;
    if (!productId) return res.status(400).json({ error: '请选择商品' });
    if (!count || count < 1 || count > 100) return res.status(400).json({ error: '生成数量1-100' });

    const result = await adminService.generateCardKeys(productId, prefix || '', count, cdkList || []);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 手动录入卡密
router.post('/card-keys/manual', auth, async (req, res) => {
  try {
    const { productId, keys, cdkList } = req.body;
    if (!productId) return res.status(400).json({ error: '请选择商品' });
    if (!keys || !Array.isArray(keys) || keys.length === 0) return res.status(400).json({ error: '请输入至少一个卡密' });
    if (keys.length > 200) return res.status(400).json({ error: '单次最多录入200个' });

    const result = await adminService.manualAddCardKeys(productId, keys, cdkList || []);
    res.status(201).json(result);
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
    await adminService.deleteCardKey(parseInt(req.params.id));
    res.json({ message: '删除成功' });
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
    const { status, page = 1, pageSize = 20 } = req.query;
    const result = await adminService.getOrders({
      status: status || '',
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

// ==================== 管理员管理 ====================

router.get('/admins', auth, async (req, res) => {
  try {
    const admins = await adminService.findAllAdmins();
    res.json(admins);
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
