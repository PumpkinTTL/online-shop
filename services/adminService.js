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

    const category = product.category;
    const categoryCode = category?.code || '';
    product.isCode = category?.smsEnabled === 1;
    product.type = categoryCode ? categoryCode.toLowerCase() : 'uncategorized';
    product.smKeyWord = category?.smKeyWord || '';
    product.smsPrice = category?.smsPrice || null;
    product.smsPaymentName = category?.smsPaymentName || '';
    return product;
  }

  async getProducts({ page = 1, pageSize = 0 } = {}) {
    const repo = dataSource.getRepository(Product);
    // pageSize=0 表示不分页，返回全部（兼容旧调用）
    if (!pageSize) {
      const products = await repo.find({
        relations: ['category'],
        order: { id: 'DESC' },
      });
      const cardKeyRepo = dataSource.getRepository(CardKey);
      for (const p of products) {
        p.stock = await cardKeyRepo.count({ where: { productId: p.id, status: 'unused' } });
        this.normalizeProduct(p);
      }
      return products;
    }
    const [items, total] = await repo.findAndCount({
      relations: ['category'],
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    const cardKeyRepo = dataSource.getRepository(CardKey);
    for (const p of items) {
      p.stock = await cardKeyRepo.count({ where: { productId: p.id, status: 'unused' } });
      this.normalizeProduct(p);
    }
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
    const where = { type: 'cardkey' }; // 只查卡密，不查优惠码
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

  async getOrders({ status, page, pageSize }) {
    const repo = dataSource.getRepository(Order);
    const where = {};
    if (status) where.status = status;

    // 后台订单查询允许无条件全表（管理需要）
    const [items, total] = await repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 关联商品信息（名称+价格+是否接码产品）
    const Product = require('../entities/Product');
    const ProductCategory = require('../entities/ProductCategory');
    const productRepo = dataSource.getRepository(Product);
    const categoryRepo = dataSource.getRepository(ProductCategory);
    const pIds = [...new Set(items.map(o => o.productId).filter(Boolean))];
    let pMap = {};
    if (pIds.length > 0) {
      const products = await productRepo.find({
        where: pIds.map(id => ({ id })),
        relations: ['category'],
      });
      const cIds = [...new Set(products.map(p => p.categoryId).filter(Boolean))];
      let cMap = {};
      if (cIds.length > 0) {
        (await categoryRepo.findByIds(cIds)).forEach(c => { cMap[c.id] = c; });
      }
      products.forEach(p => {
        pMap[p.id] = {
          name: p.name,
          price: p.price,
          isSms: (cMap[p.categoryId] || {}).smsEnabled === 1,
        };
      });
    }

    // 关联卡密信息（CDK兑换码 + code）
    const CardKey = require('../entities/CardKey');
    const ckRepo = dataSource.getRepository(CardKey);
    const ckIds = [...new Set(items.map(o => o.cardKeyId).filter(Boolean))];
    let ckMap = {};
    if (ckIds.length > 0) {
      (await ckRepo.findByIds(ckIds)).forEach(ck => { ckMap[ck.id] = { code: ck.code, CDK: ck.CDK }; });
    }

    // 关联用户名
    const User = require('../entities/User');
    const userRepo = dataSource.getRepository(User);
    const uIds = [...new Set(items.map(o => o.userId).filter(Boolean))];
    let uMap = {};
    if (uIds.length > 0) {
      (await userRepo.findByIds(uIds)).forEach(u => { uMap[u.id] = u.nickname || u.username; });
    }

    const enrichedItems = items.map(order => ({
      ...order,
      productName: (pMap[order.productId] || {}).name || '未知',
      productPrice: (pMap[order.productId] || {}).price || null,
      isSms: (pMap[order.productId] || {}).isSms || false,
      cardCDK: (ckMap[order.cardKeyId] || {}).CDK || null,
      cardCode: (ckMap[order.cardKeyId] || {}).code || null,
      username: uMap[order.userId] || null,
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

  // ==================== 优惠码管理 ====================

  // 获取优惠码列表
  async getCoupons({ status, page, pageSize }) {
    const repo = dataSource.getRepository(CardKey);
    const where = { type: 'coupon' };
    if (status) where.status = status;

    const [items, total] = await repo.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  // 创建优惠码
  async createCoupon(data) {
    const repo = dataSource.getRepository(CardKey);

    // 验证：discount 和 deduction 至少有一个
    if (!data.discount && !data.deduction) {
      throw new Error('折扣和抵扣至少填写一项');
    }
    // 如果都填了，优先用抵扣
    if (data.discount && data.deduction) {
      throw new Error('折扣和抵扣只能填写一项，不能同时设置');
    }
    // discount 范围校验：1-99 表示打 1 折到 9.9 折
    if (data.discount && (data.discount < 1 || data.discount > 99)) {
      throw new Error('折扣范围 1-99（如 10 表示打9折）');
    }
    // deduction 不能为负
    if (data.deduction && data.deduction <= 0) {
      throw new Error('抵扣金额必须大于0');
    }

    // 生成优惠码（如果没提供）
    let code = data.code;
    if (!code) {
      let exists = true;
      while (exists) {
        code = 'CPN' + this.generateCardCode('');
        exists = await repo.findOne({ where: { code } });
      }
    } else {
      const exists = await repo.findOne({ where: { code } });
      if (exists) throw new Error('优惠码已存在');
    }

    const coupon = repo.create({
      code,
      type: 'coupon',
      productId: data.productId || null, // null 表示全场通用
      discount: data.discount || null,
      deduction: data.deduction || null,
      maxUses: data.maxUses || null,
      usedCount: 0,
      validFrom: data.validFrom || null,
      validTo: data.validTo || null,
      status: 'active',
    });

    return repo.save(coupon);
  }

  // 批量生成优惠码
  async generateCoupons(data) {
    const repo = dataSource.getRepository(CardKey);

    if (!data.count || data.count < 1 || data.count > 100) {
      throw new Error('生成数量 1-100');
    }
    if (!data.discount && !data.deduction) {
      throw new Error('折扣和抵扣至少填写一项');
    }
    if (data.discount && data.deduction) {
      throw new Error('折扣和抵扣只能填写一项');
    }
    if (data.discount && (data.discount < 1 || data.discount > 99)) {
      throw new Error('折扣范围 1-99');
    }
    if (data.deduction && data.deduction <= 0) {
      throw new Error('抵扣金额必须大于0');
    }

    const prefix = data.prefix || 'CPN';
    const entities = [];

    for (let i = 0; i < data.count; i++) {
      let code;
      let exists = true;
      while (exists) {
        code = prefix + this.generateCardCode('');
        exists = await repo.findOne({ where: { code } });
      }

      entities.push(repo.create({
        code,
        type: 'coupon',
        productId: data.productId || null,
        discount: data.discount || null,
        deduction: data.deduction || null,
        maxUses: data.maxUses || null,
        usedCount: 0,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        status: 'active',
      }));
    }

    return repo.save(entities);
  }

  // 更新优惠码
  async updateCoupon(id, data) {
    const repo = dataSource.getRepository(CardKey);
    const coupon = await repo.findOne({ where: { id, type: 'coupon' } });
    if (!coupon) throw new Error('优惠码不存在');

    // 不允许同时设置 discount 和 deduction
    const newDiscount = data.discount !== undefined ? data.discount : coupon.discount;
    const newDeduction = data.deduction !== undefined ? data.deduction : coupon.deduction;
    if (newDiscount && newDeduction) {
      throw new Error('折扣和抵扣只能填写一项');
    }

    Object.assign(coupon, data);
    return repo.save(coupon);
  }

  // 删除优惠码
  async deleteCoupon(id) {
    const repo = dataSource.getRepository(CardKey);
    const coupon = await repo.findOne({ where: { id, type: 'coupon' } });
    if (!coupon) throw new Error('优惠码不存在');
    await repo.remove(coupon);
    return true;
  }

  // 批量删除优惠码
  async batchDeleteCoupons(ids) {
    const repo = dataSource.getRepository(CardKey);
    const result = await repo.delete(ids);
    return result.affected || 0;
  }
}

module.exports = new AdminService();
