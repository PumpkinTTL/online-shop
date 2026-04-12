const dataSource = require('../config/database');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const axios = require('axios');

// MAAPI 配置
const MAAPI_BASE = 'http://api./zc/data.php';
const MAAPI_TOKEN = process.env.MAAPI_TOKEN || '';

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
  async getPhone(keyword) {
    const url = `${MAAPI_BASE}?code=getPhone&token=${MAAPI_TOKEN}&keyWord=${encodeURIComponent(keyword || '')}`;
    const res = await axios.get(url, { timeout: 15000 });
    const data = res.data;
    if (typeof data === 'string' && data.startsWith('ERROR:')) {
      throw new Error(data.replace('ERROR:', '').trim());
    }
    return data; // 返回手机号
  }

  // 获取验证码（轮询 MAAPI）
  async getVerifyCode(phone, keyword, maxRetry = 12, interval = 5000) {
    for (let i = 0; i < maxRetry; i++) {
      const url = `${MAAPI_BASE}?code=getMsg&token=${MAAPI_TOKEN}&phone=${phone}&keyWord=${encodeURIComponent(keyword || '')}`;
      const res = await axios.get(url, { timeout: 15000 });
      const data = res.data;

      if (typeof data === 'string' && data.startsWith('ERROR:')) {
        throw new Error(data.replace('ERROR:', '').trim());
      }

      // 如果包含"尚未收到"，继续等待
      if (typeof data === 'string' && data.includes('[尚未收到]')) {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      // 提取验证码（4-6位数字）
      const codeMatch = data.match(/验证码[：:\s]*(\d{4,6})/);
      if (codeMatch) {
        return { code: codeMatch[1], content: data };
      }

      // 尝试直接匹配4-6位纯数字
      const numMatch = data.match(/\b(\d{4,6})\b/);
      if (numMatch) {
        return { code: numMatch[1], content: data };
      }

      // 有短信内容但无法提取验证码，返回原始内容
      return { code: '', content: data };
    }

    throw new Error('获取验证码超时，请稍后重试');
  }

  // 释放号码
  async releasePhone(phone) {
    try {
      const url = `${MAAPI_BASE}?code=release&token=${MAAPI_TOKEN}&phone=${phone}`;
      await axios.get(url, { timeout: 10000 });
    } catch (e) {
      // 释放失败不影响流程
      console.warn('释放号码失败:', e.message);
    }
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
