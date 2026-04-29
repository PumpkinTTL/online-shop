const dataSource = require('../config/database');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const Product = require('../entities/Product');
const SmsRecord = require('../entities/SmsRecord');
const axios = require('axios');
const { action, business, system } = require('../logger');

// MAAPI 配置
const MAAPI_BASE = 'http://api.ejiema.com/zc/data.php';
const MAAPI_TOKEN = process.env.MAAPI_TOKEN;

class PickupService {
  getCardKeyRepo() {
    return dataSource.getRepository(CardKey);
  }

  getOrderRepo() {
    return dataSource.getRepository(Order);
  }

  getSmsRecordRepo() {
    return dataSource.getRepository(SmsRecord);
  }

  // 验证卡密 — 返回卡密信息
  async verifyCardKey(code) {
    const repo = this.getCardKeyRepo();
    const cardKey = await repo.findOne({ where: { code } });
    if (!cardKey) throw new Error('卡密不存在');
    if (cardKey.status === 'used') throw new Error('卡密已使用');
    if (cardKey.status === 'expired') throw new Error('卡密已过期');
    return cardKey;
  }

  // 兑换卡密 — 使用事务+悲观锁防并发重复兑换
  async redeemCardKey(code, productId) {
    return await dataSource.transaction(async (manager) => {
      // 加行锁查询卡密，防止并发兑换
      const cardKey = await manager.findOne(CardKey, {
        where: { code },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cardKey) throw new Error('卡密不存在');
      if (cardKey.status === 'expired') throw new Error('卡密已过期');
      if (!cardKey.CDK) throw new Error('该卡密暂无关联的兑换码，请联系客服');
      // 如果卡密绑定了商品ID，验证是否匹配
      if (cardKey.productId && productId && cardKey.productId !== parseInt(productId)) {
        throw new Error('该卡密不适用于此商品');
      }

      // 首次兑换，原子标记为已使用
      if (cardKey.status !== 'used') {
        await manager.update(CardKey, cardKey.id, {
          status: 'used',
          usedAt: new Date(),
        });
      }

      return {
        id: cardKey.id,
        productId: cardKey.productId,
        CDK: cardKey.CDK,
      };
    });
  }

  // 获取手机号（调用 MAAPI）并写入接码记录
  async getPhone(keyword, phone, cardType, ip) {
    let url = `${MAAPI_BASE}?code=getPhone&token=${MAAPI_TOKEN}`;
    if (keyword) url += `&keyWord=${encodeURIComponent(keyword)}`;
    if (phone) url += `&phone=${encodeURIComponent(phone)}`;
    if (cardType) url += `&cardType=${encodeURIComponent(cardType)}`;

    if (!MAAPI_TOKEN) throw new Error('MAAPI Token 未配置，请设置环境变量 MAAPI_TOKEN');

    try {
      const res = await axios.get(url, { timeout: 15000 });
      const data = res.data;
      if (typeof data === 'string' && data.startsWith('ERROR:')) {
        const errorMsg = data.replace('ERROR:', '').trim();
        system.warn('maapi.getPhone', { error: errorMsg, keyword, phone, cardType, ip });
        throw new Error(errorMsg);
      }

      // 写入接码记录（免费接码来源）
      const smsRecordRepo = this.getSmsRecordRepo();
      const record = smsRecordRepo.create({
        phone: String(data),
        keyword: keyword || '',
        cardType: cardType || '全部',
        status: 'active',
        ip: ip || '',
        source: 'free',
      });
      await smsRecordRepo.save(record);

      return data; // 返回手机号
    } catch (error) {
      if (!error.message.includes('MAAPI')) {
        system.error('maapi.getPhone', {
          error: error.message,
          keyword,
          phone,
          cardType,
          ip,
        });
      }
      throw error;
    }
  }

  // 获取验证码（单次查询 MAAPI，由前端轮询调用），成功后更新接码记录
  async getVerifyCode(phone, keyword) {
    if (!MAAPI_TOKEN) throw new Error('MAAPI Token 未配置');

    const url = `${MAAPI_BASE}?code=getMsg&token=${MAAPI_TOKEN}&phone=${phone}&keyWord=${encodeURIComponent(keyword || '')}`;

    try {
      const res = await axios.get(url, { timeout: 15000 });
      const data = res.data;

      if (typeof data === 'string' && data.startsWith('ERROR:')) {
        const errorMsg = data.replace('ERROR:', '').trim();
        system.warn('maapi.getVerifyCode', { error: errorMsg, phone, keyword });
        throw new Error(errorMsg);
      }

      // 尚未收到短信
      if (typeof data === 'string' && data.includes('[尚未收到]')) {
        return { received: false, code: '', content: '' };
      }

      // 提取验证码（4-6位数字）
      let extractedCode = '';
      const codeMatch = (typeof data === 'string') && data.match(/验证码[：:\s]*(\d{4,6})/);
      if (codeMatch) {
        extractedCode = codeMatch[1];
      } else {
        // 尝试直接匹配4-6位纯数字
        const numMatch = (typeof data === 'string') && data.match(/\b(\d{4,6})\b/);
        if (numMatch) {
          extractedCode = numMatch[1];
        }
      }

      const content = typeof data === 'string' ? data : JSON.stringify(data);

      // 收到短信后更新/创建接码记录
      if (extractedCode || content) {
        const smsRecordRepo = this.getSmsRecordRepo();
        const record = await smsRecordRepo.findOne({
          where: { phone, status: 'active' },
          order: { createdAt: 'DESC' },
        });
        if (record) {
          // 更新已有记录
          await smsRecordRepo.update(record.id, {
            smsContent: content,
            verifyCode: extractedCode,
            status: extractedCode ? 'completed' : 'active',
          });
        } else {
          // isCode商品：没有通过getPhone获取号码，直接创建记录（标记来源为iscode）
          await smsRecordRepo.save(smsRecordRepo.create({
            phone,
            keyword: keyword || '',
            smsContent: content,
            verifyCode: extractedCode || '',
            status: extractedCode ? 'completed' : 'active',
            source: 'iscode',
          }));
        }
      }

      return { received: true, code: extractedCode, content };
    } catch (error) {
      if (!error.message.includes('MAAPI') && !error.message.includes('[尚未收到]')) {
        system.error('maapi.getVerifyCode', {
          error: error.message,
          phone,
          keyword,
        });
      }
      throw error;
    }
  }

  // 释放号码（同时更新接码记录状态）
  async releasePhone(phone) {
    if (!MAAPI_TOKEN) return;
    try {
      const url = `${MAAPI_BASE}?code=release&token=${MAAPI_TOKEN}&phone=${phone}`;
      await axios.get(url, { timeout: 10000 });
    } catch (e) {
      console.warn('释放号码失败:', e.message);
      system.warn('释放号码失败', { phone, error: e.message });
    }
    // 更新接码记录状态
    try {
      const smsRecordRepo = this.getSmsRecordRepo();
      const record = await smsRecordRepo.findOne({
        where: { phone, status: 'active' },
        order: { createdAt: 'DESC' },
      });
      if (record) {
        await smsRecordRepo.update(record.id, { status: 'released' });
      }
    } catch (e) {}
  }

  // 拉黑号码（同时更新接码记录状态）
  async blockPhone(phone) {
    if (!MAAPI_TOKEN) return;
    try {
      const url = `${MAAPI_BASE}?code=block&token=${MAAPI_TOKEN}&phone=${phone}`;
      await axios.get(url, { timeout: 10000 });
    } catch (e) {
      console.warn('拉黑号码失败:', e.message);
      system.warn('拉黑号码失败', { phone, error: e.message });
    }
    // 更新接码记录状态
    try {
      const smsRecordRepo = this.getSmsRecordRepo();
      const record = await smsRecordRepo.findOne({
        where: { phone, status: 'active' },
        order: { createdAt: 'DESC' },
      });
      if (record) {
        await smsRecordRepo.update(record.id, { status: 'blocked' });
      }
    } catch (e) {}
  }

  // 查询余额
  async getBalance() {
    if (!MAAPI_TOKEN) throw new Error('MAAPI Token 未配置');
    const url = `${MAAPI_BASE}?code=leftAmount&token=${MAAPI_TOKEN}`;
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;
    if (typeof data === 'string' && data.startsWith('ERROR:')) {
      throw new Error(data.replace('ERROR:', '').trim());
    }
    return data;
  }

  // 生成订单号
  generateOrderNo() {
    const now = new Date();
    const ts = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 6; i++) rand += chars[Math.floor(Math.random() * chars.length)];
    return `ORD${ts}${rand}`;
  }

  // 创建订单
  async createOrder(data, ctx = {}) {
    const { userId, cardKeyId, productId, contact, phone, verifyCode, amount, payMethod, tradeNo, couponId } = data;
    const { ip } = ctx;
    const orderRepo = this.getOrderRepo();
    const cardKeyRepo = this.getCardKeyRepo();

    // 去重：同一个 cardKeyId 如果已有订单，直接返回已有订单
    if (cardKeyId) {
      const existingOrder = await orderRepo.findOne({
        where: { cardKeyId },
        order: { id: 'DESC' },
      });
      if (existingOrder) {
        console.log(`[PickupService] cardKeyId=${cardKeyId} 已有订单 #${existingOrder.id}，跳过重复创建`);
        action.info('order.duplicate', { cardKeyId, ip: ip || null });
        return existingOrder;
      }
    }

    const order = orderRepo.create({
      orderNo: this.generateOrderNo(),
      userId: userId || null,
      cardKeyId,
      productId,
      amount: amount || null,
      payMethod: payMethod || '兑换',
      tradeNo: tradeNo || null,
      contact,
      phone,
      verifyCode,
      status: 'completed',
      completedAt: new Date(),
      couponId: couponId || null,
    });

    const savedOrder = await orderRepo.save(order);

    // 记录业务日志
    business.success('order.create', {
      orderNo: savedOrder.orderNo,
      amount: amount || null,
      userId: userId || null,
      ip: ip || null,
    });

    // 标记卡密为已使用
    if (cardKeyId) {
      await cardKeyRepo.update(cardKeyId, {
        status: 'used',
        usedAt: new Date(),
        phone,
      });
    }

    // 更新商品销量
    try {
      const productRepo = dataSource.getRepository(Product);
      await productRepo.increment({ id: productId }, 'sales', 1);
    } catch (e) {
      console.warn('[PickupService] 更新商品销量失败:', e.message);
      system.warn('更新商品销量失败', { error: e.message, productId });
    }

    return savedOrder;
  }

  // 查询订单（支持多条件）
  async queryOrders(filter = {}) {
    const orderRepo = this.getOrderRepo();

    // 构建查询条件
    const where = {};
    if (filter.userId) where.userId = parseInt(filter.userId);
    if (filter.contact) where.contact = filter.contact;
    if (filter.orderNo) where.orderNo = filter.orderNo;
    if (filter.phone) where.phone = filter.phone;
    if (filter.status) where.status = filter.status;
    if (filter.productId) where.productId = parseInt(filter.productId);

    // keyword 模式：OR 搜索 contact / orderNo / phone
    const hasKeyword = !!filter.keyword;
    const hasOtherConditions = Object.keys(where).length > 0;

    // 没有任何条件，不允许查询（防止全表扫描）
    if (!hasKeyword && !hasOtherConditions) {
      return { items: [], total: 0 };
    }

    let query = orderRepo.createQueryBuilder('o')
      .orderBy('o.createdAt', 'DESC');

    // keyword OR 条件
    if (hasKeyword) {
      const kw = `%${filter.keyword}%`;
      query = query.where(
        '(o.contact LIKE :kw OR o.orderNo LIKE :kw OR o.phone LIKE :kw)',
        { kw }
      );
      // 其他条件 AND
      if (filter.userId) query = query.andWhere('o.userId = :uid', { uid: parseInt(filter.userId) });
      if (filter.status) query = query.andWhere('o.status = :st', { st: filter.status });
      if (filter.productId) query = query.andWhere('o.productId = :pid', { pid: parseInt(filter.productId) });
    } else {
      // 无 keyword，用传统 AND 查询
      Object.entries(where).forEach(([key, val]) => {
        query = query.andWhere(`o.${key} = :${key}`, { [key]: val });
      });
    }

    // 分页
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;
    query = query.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await query.getManyAndCount();

    // 关联查询商品信息（名称+价格）
    const productRepo = dataSource.getRepository(require('../entities/Product'));
    const productIds = [...new Set(items.map(o => o.productId).filter(Boolean))];
    let productMap = {};
    if (productIds.length > 0) {
      const products = await productRepo.findByIds(productIds);
      products.forEach(p => { productMap[p.id] = { name: p.name, price: p.price, image: p.image }; });
    }

    // 关联查询卡密信息（卡密code + CDK兑换码）
    const cardKeyRepo = this.getCardKeyRepo();
    const cardKeyIds = [...new Set(items.map(o => o.cardKeyId).filter(Boolean))];
    let cardKeyMap = {};
    if (cardKeyIds.length > 0) {
      const cardKeys = await cardKeyRepo.findByIds(cardKeyIds);
      cardKeys.forEach(ck => { cardKeyMap[ck.id] = { code: ck.code, CDK: ck.CDK, keyword: ck.keyword }; });
    }

    // 关联查询优惠码信息
    const Coupon = require('../entities/Coupon');
    const couponRepo = dataSource.getRepository(Coupon);
    const couponIds = [...new Set(items.map(o => o.couponId).filter(Boolean))];
    let couponMap = {};
    if (couponIds.length > 0) {
      const coupons = await couponRepo.findByIds(couponIds);
      coupons.forEach(c => {
        couponMap[c.id] = {
          code: c.code,
          discount: c.discount ? parseFloat(c.discount) : null,
          deduction: c.deduction ? parseFloat(c.deduction) : null,
        };
      });
    }

    const enrichedItems = items.map(order => {
      const product = productMap[order.productId] || {};
      const cardKey = cardKeyMap[order.cardKeyId] || {};
      const coupon = couponMap[order.couponId] || {};
      return {
        ...order,
        productName: product.name || '未知商品',
        productPrice: product.price || null,
        productImage: product.image || null,
        cardCode: cardKey.code || null,
        cardCDK: cardKey.CDK || null,
        cardKeyword: cardKey.keyword || null,
        couponCode: coupon.code || null,
        couponDiscount: coupon.discount || null,
        couponDeduction: coupon.deduction || null,
      };
    });

    return { items: enrichedItems, total };
  }

  // 查询接码记录（后台用，支持 source 筛选）
  async querySmsRecords(filter = {}) {
    const repo = this.getSmsRecordRepo();
    const where = {};
    if (filter.status) where.status = filter.status;
    if (filter.phone) where.phone = filter.phone;
    if (filter.keyword) where.keyword = filter.keyword;
    if (filter.source) where.source = filter.source;

    const [items, total] = await repo.findAndCount({
      where: Object.keys(where).length > 0 ? where : undefined,
      order: { createdAt: 'DESC' },
      skip: ((filter.page || 1) - 1) * (filter.pageSize || 20),
      take: filter.pageSize || 20,
    });

    return { items, total };
  }

  // 检查号码是否已有接码记录（非首次登录检测）
  async getPhoneRecordCount(phone) {
    const repo = this.getSmsRecordRepo();
    return repo.count({ where: { phone } });
  }

  // ==================== isCode 商品专用方法 ====================

  // isCode 商品：获取验证码（关联卡密和商品，写入 iscode 来源的接码记录）
  async iscodeGetVerifyCode(phone, cardKeyId, productId, ip, ctx = {}) {
    if (!MAAPI_TOKEN) throw new Error('MAAPI Token 未配置');
    if (!phone) throw new Error('手机号不能为空');

    let actualKeyword = '';
    let actualProductId = productId;

    // 接码权限检查：查 Order 表该 cardKeyId 是否有 status='completed' 的订单
    if (cardKeyId) {
      const orderRepo = this.getOrderRepo();
      const order = await orderRepo.findOne({
        where: { cardKeyId, status: 'completed' },
        order: { id: 'DESC' },
      });
      if (!order) {
        const err = new Error('NEED_PURCHASE');
        err.code = 'NEED_PURCHASE';
        throw err;
      }
      // 从订单获取商品ID和商品信息（关联类别）
      actualProductId = order.productId;
      const productRepo = this.getProductRepo();
      const product = await productRepo.findOne({
        where: { id: actualProductId },
        relations: ['category'],
      });
      // 从类别获取配置的关键字，忽略前端传来的
      if (product?.category?.smKeyWord) {
        actualKeyword = product.category.smKeyWord;
      }
    }

    const url = `${MAAPI_BASE}?code=getMsg&token=${MAAPI_TOKEN}&phone=${phone}&keyWord=${encodeURIComponent(actualKeyword || '')}`;
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;

    if (typeof data === 'string' && data.startsWith('ERROR:')) {
      throw new Error(data.replace('ERROR:', '').trim());
    }

    // 尚未收到短信
    if (typeof data === 'string' && data.includes('[尚未收到]')) {
      return { received: false, code: '', content: '' };
    }

    // 提取验证码（4-6位数字）
    let extractedCode = '';
    const codeMatch = (typeof data === 'string') && data.match(/验证码[：:\s]*(\d{4,6})/);
    if (codeMatch) {
      extractedCode = codeMatch[1];
    } else {
      const numMatch = (typeof data === 'string') && data.match(/\b(\d{4,6})\b/);
      if (numMatch) {
        extractedCode = numMatch[1];
      }
    }

    const content = typeof data === 'string' ? data : JSON.stringify(data);

    // 收到短信后更新/创建 isCode 接码记录
    if (extractedCode || content) {
      const smsRecordRepo = this.getSmsRecordRepo();
      // 优先查找同一卡密的 iscode 活跃记录
      const where = { phone, source: 'iscode', status: 'active' };
      if (cardKeyId) where.cardKeyId = cardKeyId;
      const record = await smsRecordRepo.findOne({
        where,
        order: { createdAt: 'DESC' },
      });
      if (record) {
        // 更新已有记录
        await smsRecordRepo.update(record.id, {
          smsContent: content,
          verifyCode: extractedCode,
          status: extractedCode ? 'completed' : 'active',
        });
      } else {
        // 新建 isCode 接码记录
        await smsRecordRepo.save(smsRecordRepo.create({
          phone,
          keyword: actualKeyword || '',
          smsContent: content,
          verifyCode: extractedCode || '',
          status: extractedCode ? 'completed' : 'active',
          source: 'iscode',
          cardKeyId: cardKeyId || null,
          productId: actualProductId || null,
          ip: ip || '',
        }));
      }

      // 接码成功后，将 Order 的 status 从 'completed' 改为 'pending'（下次接码需要付费）
      if (extractedCode && cardKeyId) {
        try {
          const orderRepo = this.getOrderRepo();
          const order = await orderRepo.findOne({
            where: { cardKeyId, status: 'completed' },
            order: { id: 'DESC' },
          });
          if (order) {
            await orderRepo.update(order.id, { status: 'pending', completedAt: null });
            console.log(`[PickupService] 接码成功，Order #${order.id} status→pending`);
            action.success('sms.iscode', { cardKeyId, ip });
          }
        } catch (e) {
          console.warn('[PickupService] 更新订单状态失败:', e.message);
          system.warn('更新订单状态失败', { error: e.message, cardKeyId });
        }
      }
    }

    return { received: true, code: extractedCode, content };
  }

  // isCode 商品：检查接码状态（按卡密+手机号查询）
  async iscodeCheckStatus(phone, cardKeyId) {
    const repo = this.getSmsRecordRepo();
    const where = { phone, source: 'iscode' };
    if (cardKeyId) where.cardKeyId = cardKeyId;

    const record = await repo.findOne({
      where,
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      return { exists: false, status: null, verifyCode: null };
    }

    return {
      exists: true,
      status: record.status,
      verifyCode: record.verifyCode || null,
      smsContent: record.smsContent || null,
    };
  }

  // 批量删除接码记录
  async batchDeleteSmsRecords(ids) {
    const repo = this.getSmsRecordRepo();
    const result = await repo.delete(ids);
    return result.affected || 0;
  }
}

module.exports = new PickupService();
