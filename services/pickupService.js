const dataSource = require('../config/database');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const axios = require('axios');

// MAAPI 配置
const MAAPI_BASE = 'http://api.ejiema.com/zc/data.php';
const MAAPI_TOKEN = process.env.MAAPI_TOKEN || '3a6cf615a7524b218f116eb3c1df5728';

class PickupService {
  getCardKeyRepo() {
    return dataSource.getRepository(CardKey);
  }

  getOrderRepo() {
    return dataSource.getRepository(Order);
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

  // 兑换卡密 — 验证卡密，返回CDK；已使用的卡密也返回CDK（第三方无法验证是否已兑换）
  async redeemCardKey(code, productId) {
    const repo = this.getCardKeyRepo();
    const cardKey = await repo.findOne({ where: { code } });
    if (!cardKey) throw new Error('卡密不存在');
    if (cardKey.status === 'expired') throw new Error('卡密已过期');
    if (!cardKey.CDK) throw new Error('该卡密暂无关联的兑换码，请联系客服');
    // 如果卡密绑定了商品ID，验证是否匹配
    if (cardKey.productId && productId && cardKey.productId !== parseInt(productId)) {
      throw new Error('该卡密不适用于此商品');
    }

    // 首次兑换，标记为已使用
    if (cardKey.status !== 'used') {
      await repo.update(cardKey.id, {
        status: 'used',
        usedAt: new Date(),
      });
    }

    return {
      id: cardKey.id,
      productId: cardKey.productId,
      CDK: cardKey.CDK,
    };
  }

  // 获取手机号（调用 MAAPI）
  async getPhone(keyword, phone, cardType) {
    let url = `${MAAPI_BASE}?code=getPhone&token=${MAAPI_TOKEN}`;
    if (keyword) url += `&keyWord=${encodeURIComponent(keyword)}`;
    if (phone) url += `&phone=${encodeURIComponent(phone)}`;
    if (cardType) url += `&cardType=${encodeURIComponent(cardType)}`;

    if (!MAAPI_TOKEN) throw new Error('MAAPI Token 未配置，请设置环境变量 MAAPI_TOKEN');

    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;
    if (typeof data === 'string' && data.startsWith('ERROR:')) {
      throw new Error(data.replace('ERROR:', '').trim());
    }
    return data; // 返回手机号
  }

  // 获取验证码（单次查询 MAAPI，由前端轮询调用）
  async getVerifyCode(phone, keyword) {
    if (!MAAPI_TOKEN) throw new Error('MAAPI Token 未配置');

    const url = `${MAAPI_BASE}?code=getMsg&token=${MAAPI_TOKEN}&phone=${phone}&keyWord=${encodeURIComponent(keyword || '')}`;
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
    const codeMatch = (typeof data === 'string') && data.match(/验证码[：:\s]*(\d{4,6})/);
    if (codeMatch) {
      return { received: true, code: codeMatch[1], content: data };
    }

    // 尝试直接匹配4-6位纯数字
    const numMatch = (typeof data === 'string') && data.match(/\b(\d{4,6})\b/);
    if (numMatch) {
      return { received: true, code: numMatch[1], content: data };
    }

    // 有短信内容但无法提取验证码，返回原始内容
    return { received: true, code: '', content: typeof data === 'string' ? data : JSON.stringify(data) };
  }

  // 释放号码
  async releasePhone(phone) {
    if (!MAAPI_TOKEN) return;
    try {
      const url = `${MAAPI_BASE}?code=release&token=${MAAPI_TOKEN}&phone=${phone}`;
      await axios.get(url, { timeout: 10000 });
    } catch (e) {
      console.warn('释放号码失败:', e.message);
    }
  }

  // 拉黑号码
  async blockPhone(phone) {
    if (!MAAPI_TOKEN) return;
    try {
      const url = `${MAAPI_BASE}?code=block&token=${MAAPI_TOKEN}&phone=${phone}`;
      await axios.get(url, { timeout: 10000 });
    } catch (e) {
      console.warn('拉黑号码失败:', e.message);
    }
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
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${ts}${rand}`;
  }

  // 创建订单
  async createOrder(data) {
    const { cardKeyId, productId, contact, phone, verifyCode } = data;
    const orderRepo = this.getOrderRepo();
    const cardKeyRepo = this.getCardKeyRepo();

    const order = orderRepo.create({
      orderNo: this.generateOrderNo(),
      cardKeyId,
      productId,
      contact,
      phone,
      verifyCode,
      status: 'completed',
      completedAt: new Date(),
    });

    const savedOrder = await orderRepo.save(order);

    // 标记卡密为已使用
    if (cardKeyId) {
      await cardKeyRepo.update(cardKeyId, {
        status: 'used',
        usedAt: new Date(),
        phone,
      });
    }

    return savedOrder;
  }

  // 按联系方式查询订单
  async queryOrders(contact) {
    const orderRepo = this.getOrderRepo();
    return orderRepo.find({
      where: { contact },
      order: { createdAt: 'DESC' },
    });
  }
}

module.exports = new PickupService();
