const bcrypt = require('bcryptjs');
const { In } = require('typeorm');
const dataSource = require('../config/database');
const Admin = require('../entities/Admin');
const Product = require('../entities/Product');
const ProductCategory = require('../entities/ProductCategory');
const User = require('../entities/User');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const Coupon = require('../entities/Coupon');
const SmsRecord = require('../entities/SmsRecord');

const SALT_ROUNDS = 10;
const LOW_STOCK_THRESHOLD = 5;

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

    // 随机生成安全密码，避免硬编码弱密码
    const crypto = require('crypto');
    const defaultPassword = crypto.randomBytes(8).toString('hex'); // 16位随机密码
    const hash = await this.hashPassword(defaultPassword);
    const admin = this.getAdminRepo().create({
      username: 'admin',
      password: hash,
      nickname: '超级管理员',
      role: 'super',
    });
    const saved = await this.getAdminRepo().save(admin);
    return { admin: saved, defaultPassword }; // 返回明文密码供启动日志打印一次
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
  async findAllAdmins({ page = 1, pageSize = 0 } = {}) {
    const repo = this.getAdminRepo();
    // pageSize=0 表示不分页，返回全部
    if (!pageSize) {
      const admins = await repo.find();
      return admins.map(({ password, ...a }) => a);
    }
    const [items, total] = await repo.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: items.map(({ password, ...a }) => a), total, page, pageSize };
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

    // 今日订单数 + 今日收入
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayOrders = await orderRepo
      .createQueryBuilder('o')
      .where('o.createdAt >= :date', { date: todayStart })
      .getMany();
    const todayOrderCount = todayOrders.length;
    const todayRevenue = todayOrders
      .filter(o => o.status === 'completed' && o.amount != null)
      .reduce((sum, o) => sum + parseFloat(o.amount), 0);

    // 待处理订单（最近20条）
    const pendingOrders = await orderRepo.find({
      where: { status: 'pending' },
      order: { id: 'DESC' },
      take: 20,
    });

    // 库存不足商品（批量聚合查询，避免 N+1）
    const stockCounts = await cardKeyRepo
      .createQueryBuilder('ck')
      .select('ck.productId', 'productId')
      .addSelect('COUNT(*)', 'stock')
      .where('ck.status = :status', { status: 'unused' })
      .groupBy('ck.productId')
      .getRawMany();
    const stockMap = {};
    stockCounts.forEach(r => { stockMap[r.productId] = parseInt(r.stock); });
    const allProducts = await productRepo.find();
    const lowStockProducts = allProducts
      .filter(p => (stockMap[p.id] || 0) < LOW_STOCK_THRESHOLD)
      .map(p => ({ name: p.name, stock: stockMap[p.id] || 0 }));

    return {
      productCount,
      userCount,
      cardKeyUnused,
      cardKeyUsed,
      orderCount,
      orderCompleted,
      recentOrders,
      smsRecordCount,
      todayOrderCount,
      todayRevenue: todayRevenue.toFixed(2),
      pendingOrders,
      lowStockProducts,
    };
  }

  // ==================== 商品管理 ====================

  normalizeProduct(product) {
    if (!product) return product;

    const category = product.category;
    const categoryCode = category?.code || '';
    product.isCode = category?.smsEnabled === 1;
    product.type = categoryCode ? categoryCode.toLowerCase() : 'uncategorized';
    product.smKeyWord = category?.smKeyWord || '';
    product.smsPrice = category?.smsPrice || null;
    product.smsPaymentName = category?.smsPaymentName || '';
    return product;
  }

  // 批量查询库存（避免 N+1）
  async batchGetStock(productIds) {
    if (productIds.length === 0) return {};
    const cardKeyRepo = dataSource.getRepository(CardKey);
    const rows = await cardKeyRepo
      .createQueryBuilder('ck')
      .select('ck.productId', 'productId')
      .addSelect('COUNT(*)', 'stock')
      .where('ck.status = :status AND ck.productId IN (:...ids)', { status: 'unused', ids: productIds })
      .groupBy('ck.productId')
      .getRawMany();
    const map = {};
    rows.forEach(r => { map[r.productId] = parseInt(r.stock); });
    return map;
  }

  async getProducts({ page = 1, pageSize = 0 } = {}) {
    const repo = dataSource.getRepository(Product);
    if (!pageSize) {
      const products = await repo.find({
        relations: ['category'],
        order: { id: 'DESC' },
      });
      const stockMap = await this.batchGetStock(products.map(p => p.id));
      products.forEach(p => { p.stock = stockMap[p.id] || 0; this.normalizeProduct(p); });
      return products;
    }
    const [items, total] = await repo.findAndCount({
      relations: ['category'],
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const stockMap = await this.batchGetStock(items.map(p => p.id));
    items.forEach(p => { p.stock = stockMap[p.id] || 0; this.normalizeProduct(p); });
    return { items, total, page, pageSize };
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

  async getUsers({ page = 1, pageSize = 0 } = {}) {
    const repo = dataSource.getRepository(User);
    // pageSize=0 表示不分页，返回全部
    if (!pageSize) {
      const users = await repo.find({ order: { id: 'DESC' } });
      return users.map(({ password, ...u }) => u);
    }
    const [items, total] = await repo.findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: items.map(({ password, ...u }) => u), total, page, pageSize };
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

  // 重置用户密码
  async resetUserPassword(id, newPassword) {
    const repo = dataSource.getRepository(User);
    const user = await repo.findOne({ where: { id } });
    if (!user) throw new Error('用户不存在');
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hash;
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
  async generateCardKeys(productId, prefix, count, cdkList, deliveryInfoList) {
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
        deliveryInfo: (deliveryInfoList && deliveryInfoList[i]) || null,
        status: 'unused',
      }));
    }

    return repo.save(entities);
  }

  // 手动录入卡密
  async manualAddCardKeys(productId, keys, cdkList, deliveryInfoList) {
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
        deliveryInfo: (deliveryInfoList && deliveryInfoList[i]) || null,
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

  async batchDeleteProducts(ids) {
    const repo = dataSource.getRepository(Product);
    const result = await repo.delete(ids);
    return result.affected || 0;
  }

  async batchDeleteOrders(ids) {
    const repo = dataSource.getRepository(Order);
    const result = await repo.delete(ids);
    return result.affected || 0;
  }

  async batchDeleteUsers(ids) {
    const repo = dataSource.getRepository(User);
    const result = await repo.delete(ids);
    return result.affected || 0;
  }

  // ==================== 订单管理 ====================

  async getOrders({ status, userId, payMethod, orderNo, cardCode, page, pageSize }) {
    const repo = dataSource.getRepository(Order);

    // 卡密搜索需要 JOIN，其他用简单 where
    if (cardCode) {
      const qb = repo.createQueryBuilder('o')
        .leftJoin(CardKey, 'ck', 'o.cardKeyId = ck.id')
        .orderBy('o.id', 'DESC')
        .offset((page - 1) * pageSize)
        .limit(pageSize);

      if (status) qb.andWhere('o.status = :status', { status });
      if (userId) qb.andWhere('o.userId = :userId', { userId });
      if (payMethod) qb.andWhere('o.payMethod = :payMethod', { payMethod });
      if (orderNo) qb.andWhere('o.orderNo LIKE :orderNo', { orderNo: `%${orderNo}%` });
      qb.andWhere('ck.code LIKE :cardCode', { cardCode: `%${cardCode}%` });

      const [items, total] = await qb.getManyAndCount();
      return await this._enrichOrders(items, total, page, pageSize);
    }

    // 无卡密搜索，用 findAndCount
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (payMethod) where.payMethod = payMethod;

    let query = { where, order: { id: 'DESC' }, skip: (page - 1) * pageSize, take: pageSize };
    if (orderNo) {
      const qb = repo.createQueryBuilder('o')
        .orderBy('o.id', 'DESC')
        .offset((page - 1) * pageSize)
        .limit(pageSize);
      if (status) qb.andWhere('o.status = :status', { status });
      if (userId) qb.andWhere('o.userId = :userId', { userId });
      if (payMethod) qb.andWhere('o.payMethod = :payMethod', { payMethod });
      qb.andWhere('o.orderNo LIKE :orderNo', { orderNo: `%${orderNo}%` });
      const [items, total] = await qb.getManyAndCount();
      return await this._enrichOrders(items, total, page, pageSize);
    }

    const [items, total] = await repo.findAndCount(query);
    return await this._enrichOrders(items, total, page, pageSize);
  }

  async _enrichOrders(items, total, page, pageSize) {

    // 关联商品信息（名称+价格+是否接码产品）
    const productRepo = dataSource.getRepository(Product);
    const pIds = [...new Set(items.map(o => o.productId).filter(Boolean))];
    let pMap = {};
    if (pIds.length > 0) {
      const products = await productRepo.find({
        where: { id: In(pIds) },
        relations: ['category'],
      });
      products.forEach(p => {
        pMap[p.id] = {
          name: p.name,
          price: p.price,
          isSms: p.category?.smsEnabled === 1,
        };
      });
    }

    // 关联卡密信息（CDK兑换码 + code）
    const ckRepo = dataSource.getRepository(CardKey);
    const ckIds = [...new Set(items.map(o => o.cardKeyId).filter(Boolean))];
    let ckMap = {};
    if (ckIds.length > 0) {
      (await ckRepo.findBy({ id: In(ckIds) })).forEach(ck => { ckMap[ck.id] = { code: ck.code, CDK: ck.CDK, deliveryInfo: ck.deliveryInfo || null }; });
    }

    // 关联用户名
    const userRepo = dataSource.getRepository(User);
    const uIds = [...new Set(items.map(o => o.userId).filter(Boolean))];
    let uMap = {};
    if (uIds.length > 0) {
      (await userRepo.findBy({ id: In(uIds) })).forEach(u => { uMap[u.id] = u.nickname || u.username; });
    }

    // 关联优惠码信息
    const couponRepo = dataSource.getRepository(Coupon);
    const cpIds = [...new Set(items.map(o => o.couponId).filter(Boolean))];
    let cpMap = {};
    if (cpIds.length > 0) {
      (await couponRepo.findBy({ id: In(cpIds) })).forEach(c => {
        cpMap[c.id] = {
          code: c.code,
          discount: c.discount ? parseFloat(c.discount) : null,
          deduction: c.deduction ? parseFloat(c.deduction) : null,
        };
      });
    }

    const enrichedItems = items.map(order => ({
      ...order,
      productName: (pMap[order.productId] || {}).name || '未知',
      productPrice: (pMap[order.productId] || {}).price || null,
      isSms: (pMap[order.productId] || {}).isSms || false,
      cardCDK: (ckMap[order.cardKeyId] || {}).CDK || null,
      cardCode: (ckMap[order.cardKeyId] || {}).code || null,
      deliveryInfo: (ckMap[order.cardKeyId] || {}).deliveryInfo || null,
      username: uMap[order.userId] || null,
      couponCode: (cpMap[order.couponId] || {}).code || null,
      couponDiscount: (cpMap[order.couponId] || {}).discount || null,
      couponDeduction: (cpMap[order.couponId] || {}).deduction || null,
    }));

    return { items: enrichedItems, total, page, pageSize };
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
    const category = repo.create(data);
    return await repo.save(category);
  }

  async updateCategory(id, data) {
    const repo = dataSource.getRepository(ProductCategory);
    const category = await repo.findOne({ where: { id } });
    if (!category) throw new Error('类别不存在');
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

  async batchDeleteCategories(ids) {
    const repo = dataSource.getRepository(ProductCategory);
    const productRepo = dataSource.getRepository(Product);
    let deleted = 0;
    for (const id of ids) {
      const count = await productRepo.count({ where: { categoryId: id } });
      if (count > 0) continue; // 跳过有商品的类别
      const category = await repo.findOne({ where: { id } });
      if (category) {
        await repo.remove(category);
        deleted++;
      }
    }
    return deleted;
  }

}


module.exports = new AdminService();
