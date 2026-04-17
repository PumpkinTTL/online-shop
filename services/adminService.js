const bcrypt = require('bcryptjs');
const dataSource = require('../config/database');
const Admin = require('../entities/Admin');
const Product = require('../entities/Product');
const ProductCategory = require('../entities/ProductCategory');
const User = require('../entities/User');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const SmsRecord = require('../entities/SmsRecord');

const SALT_ROUNDS = 10;

// 卡密前缀预设
const CODE_PREFIXES = {
  XY: '闲鱼',
  TB: '淘宝',
  WX: '微信',
  DD: '多多',
  ZF: '支付宝',
  DY: '抖音',
  KS: '快手',
  DEFAULT: '默认',
};

class AdminService {
  // ==================== 管理员鉴权 ====================

  getAdminRepo() {
    return dataSource.getRepository(Admin);
  }

  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  async findByUsername(username) {
    return this.getAdminRepo().findOne({ where: { username } });
  }

  // 管理员登录
  async login(username, password) {
    const admin = await this.findByUsername(username);
    if (!admin) throw new Error('用户名或密码错误');
    if (!admin.isActive) throw new Error('账号已被禁用');

    const isValid = await this.comparePassword(password, admin.password);
    if (!isValid) throw new Error('用户名或密码错误');

    const { password: _, ...info } = admin;
    return info;
  }

  // 初始化默认管理员（首次启动时调用）
  async initDefaultAdmin() {
    const existing = await this.getAdminRepo().count();
    if (existing > 0) return null;

    const hash = await this.hashPassword('admin123');
    const admin = this.getAdminRepo().create({
      username: 'admin',
      password: hash,
      nickname: '超级管理员',
      role: 'super',
    });
    return this.getAdminRepo().save(admin);
  }

  // 创建管理员
  async createAdmin(data) {
    const existing = await this.findByUsername(data.username);
    if (existing) throw new Error('用户名已存在');

    const hash = await this.hashPassword(data.password);
    const admin = this.getAdminRepo().create({
      username: data.username,
      password: hash,
      nickname: data.nickname || data.username,
      role: data.role || 'admin',
    });
    return this.getAdminRepo().save(admin);
  }

  // 修改密码
  async changePassword(adminId, oldPassword, newPassword) {
    const admin = await this.getAdminRepo().findOne({ where: { id: adminId } });
    if (!admin) throw new Error('管理员不存在');

    const isValid = await this.comparePassword(oldPassword, admin.password);
    if (!isValid) throw new Error('原密码错误');

    const hash = await this.hashPassword(newPassword);
    await this.getAdminRepo().update(adminId, { password: hash });
    return true;
  }

  // 获取所有管理员
  async findAllAdmins() {
    const admins = await this.getAdminRepo().find();
    return admins.map(({ password, ...a }) => a);
  }

  // 删除管理员
  async deleteAdmin(id) {
    const admin = await this.getAdminRepo().findOne({ where: { id } });
    if (!admin) throw new Error('管理员不存在');
    if (admin.role === 'super') throw new Error('不能删除超级管理员');
    await this.getAdminRepo().remove(admin);
    return true;
  }

  // ==================== 仪表盘统计 ====================

  async getStats() {
    const productRepo = dataSource.getRepository(Product);
    const userRepo = dataSource.getRepository(User);
    const cardKeyRepo = dataSource.getRepository(CardKey);
    const orderRepo = dataSource.getRepository(Order);
    const smsRecordRepo = dataSource.getRepository(SmsRecord);

    const [productCount, userCount, cardKeyUnused, cardKeyUsed, orderCount, orderCompleted, smsRecordCount] = await Promise.all([
      productRepo.count(),
      userRepo.count(),
      cardKeyRepo.count({ where: { status: 'unused' } }),
      cardKeyRepo.count({ where: { status: 'used' } }),
      orderRepo.count(),
      orderRepo.count({ where: { status: 'completed' } }),
      smsRecordRepo.count(),
    ]);

    // 近7天订单数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :date', { date: sevenDaysAgo })
      .getCount();

    return {
      productCount,
      userCount,
      cardKeyUnused,
      cardKeyUsed,
      orderCount,
      orderCompleted,
      recentOrders,
      smsRecordCount,
    };
  }

  // ==================== 商品管理 ====================

  normalizeProduct(product) {
    if (!product) return product;

    const categoryCode = product.category?.code || '';
    product.isCode = categoryCode === 'SMS';
    product.type = categoryCode ? categoryCode.toLowerCase() : 'uncategorized';
    product.smKeyWord = product.category?.smKeyWord || '';
    product.smsPrice = product.category?.smsPrice || null;
    product.smsPaymentName = product.category?.smsPaymentName || '';
    return product;
  }

  async getProducts() {
    const products = await dataSource.getRepository(Product).find({
      relations: ['category'],
      order: { id: 'DESC' },
    });
    // 附加库存（卡密动态计算）
    const cardKeyRepo = dataSource.getRepository(CardKey);
    for (const p of products) {
      p.stock = await cardKeyRepo.count({ where: { productId: p.id, status: 'unused' } });
      this.normalizeProduct(p);
    }
    return products;
  }

  async getProduct(id) {
    const product = await dataSource.getRepository(Product).findOne({
      where: { id },
      relations: ['category'],
    });
    if (product) {
      const cardKeyRepo = dataSource.getRepository(CardKey);
      product.stock = await cardKeyRepo.count({ where: { productId: product.id, status: 'unused' } });
      this.normalizeProduct(product);
    }
    return product;
  }

  async createProduct(data) {
    const repo = dataSource.getRepository(Product);
    const product = repo.create(data);
    return repo.save(product);
  }

  async updateProduct(id, data) {
    const repo = dataSource.getRepository(Product);
    const product = await repo.findOne({ where: { id } });
    if (!product) throw new Error('商品不存在');
    Object.assign(product, data);
    return repo.save(product);
  }

  async deleteProduct(id) {
    const repo = dataSource.getRepository(Product);
    const product = await repo.findOne({ where: { id } });
    if (!product) throw new Error('商品不存在');
    await repo.remove(product);
    return true;
  }

  // ==================== 用户管理 ====================

  async getUsers() {
    const users = await dataSource.getRepository(User).find({ order: { id: 'DESC' } });
    return users.map(({ password, ...u }) => u);
  }

  async getUser(id) {
    const user = await dataSource.getRepository(User).findOne({ where: { id } });
    if (!user) return null;
    const { password, ...info } = user;
    return info;
  }

  async toggleUserActive(id) {
    const repo = dataSource.getRepository(User);
    const user = await repo.findOne({ where: { id } });
    if (!user) throw new Error('用户不存在');
    user.isActive = user.isActive ? 0 : 1;
    return repo.save(user);
  }

  async deleteUser(id) {
    const repo = dataSource.getRepository(User);
    const user = await repo.findOne({ where: { id } });
    if (!user) throw new Error('用户不存在');
    await repo.remove(user);
    return true;
  }

  // ==================== 卡密管理 ====================

  getPrefixes() {
    return CODE_PREFIXES;
  }

  // 生成卡密码：XXXXX-XXXXX 格式，10位
  generateCardCode(prefix) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const gen5 = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return (prefix || '') + gen5() + '-' + gen5();
  }

  // 批量生成卡密
  async generateCardKeys(productId, prefix, count, cdkList) {
    const repo = dataSource.getRepository(CardKey);
    const entities = [];

    for (let i = 0; i < count; i++) {
      let code;
      let exists = true;
      // 确保卡密唯一
      while (exists) {
        code = this.generateCardCode(prefix);
        exists = await repo.findOne({ where: { code } });
      }

      entities.push(repo.create({
        code,
        productId: parseInt(productId),
        CDK: (cdkList && cdkList[i]) || null,
        status: 'unused',
      }));
    }

    return repo.save(entities);
  }

  // 手动录入卡密
  async manualAddCardKeys(productId, keys, cdkList) {
    const repo = dataSource.getRepository(CardKey);
    const entities = [];

    for (let i = 0; i < keys.length; i++) {
      const code = keys[i].trim();
      if (!code) continue;

      // 检查卡密是否重复
      const exists = await repo.findOne({ where: { code } });
      if (exists) {
        throw new Error(`卡密已存在: ${code}`);
      }

      entities.push(repo.create({
        code,
        productId: parseInt(productId),
        CDK: (cdkList && cdkList[i]) || null,
        status: 'unused',
      }));
    }

    if (entities.length === 0) {
      throw new Error('没有有效的卡密');
    }

    return repo.save(entities);
  }

  async getCardKeys({ productId, status, page, pageSize }) {
    const repo = dataSource.getRepository(CardKey);
    const where = {};
    if (productId) where.productId = parseInt(productId);
    if (status) where.status = status;

    const [items, total] = await repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async updateCardKey(id, data) {
    const repo = dataSource.getRepository(CardKey);
    const cardKey = await repo.findOne({ where: { id } });
    if (!cardKey) throw new Error('卡密不存在');
    Object.assign(cardKey, data);
    return repo.save(cardKey);
  }

  async deleteCardKey(id) {
    const repo = dataSource.getRepository(CardKey);
    const cardKey = await repo.findOne({ where: { id } });
    if (!cardKey) throw new Error('卡密不存在');
    await repo.remove(cardKey);
    return true;
  }

  async batchDeleteCardKeys(ids) {
    const repo = dataSource.getRepository(CardKey);
    const result = await repo.delete(ids);
    return result.affected || 0;
  }

  // ==================== 订单管理 ====================

  async getOrders({ status, page, pageSize }) {
    const repo = dataSource.getRepository(Order);
    const where = {};
    if (status) where.status = status;

    const [items, total] = await repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async deleteOrder(id) {
    const repo = dataSource.getRepository(Order);
    const order = await repo.findOne({ where: { id } });
    if (!order) throw new Error('订单不存在');
    await repo.remove(order);
    return true;
  }

  // ==================== 商品类别管理 ====================

  async getCategories() {
    const repo = dataSource.getRepository(ProductCategory);
    return await repo.find({ order: { sort: 'ASC', id: 'ASC' } });
  }

  async getCategory(id) {
    const repo = dataSource.getRepository(ProductCategory);
    return await repo.findOne({ where: { id } });
  }

  async createCategory(data) {
    const repo = dataSource.getRepository(ProductCategory);
    delete data.credit;
    const category = repo.create(data);
    return await repo.save(category);
  }

  async updateCategory(id, data) {
    const repo = dataSource.getRepository(ProductCategory);
    const category = await repo.findOne({ where: { id } });
    if (!category) throw new Error('类别不存在');
    delete data.credit;
    Object.assign(category, data);
    return await repo.save(category);
  }

  async deleteCategory(id) {
    const repo = dataSource.getRepository(ProductCategory);
    const category = await repo.findOne({ where: { id } });
    if (!category) throw new Error('类别不存在');

    // 检查是否有商品使用该类别
    const productRepo = dataSource.getRepository(Product);
    const count = await productRepo.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new Error(`该类别下还有 ${count} 个商品，无法删除`);
    }

    await repo.remove(category);
    return true;
  }
}

module.exports = new AdminService();
