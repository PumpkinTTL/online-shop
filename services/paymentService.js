const dataSource = require('../config/database');
const PaymentOrder = require('../entities/PaymentOrder');
const CardKey = require('../entities/CardKey');
const Product = require('../entities/Product');
const Order = require('../entities/Order');
const couponService = require('./couponService');
const { getAlipaySdk } = require('../config/alipay');
const { business, system } = require('../logger');

class PaymentService {
  getPaymentOrderRepo() {
    return dataSource.getRepository(PaymentOrder);
  }

  getCardKeyRepo() {
    return dataSource.getRepository(CardKey);
  }

  getProductRepo() {
    return dataSource.getRepository(Product);
  }

  // 获取商品显示名称（优先使用代号 code，避免敏感信息）
  getDisplayName(product) {
    if (product.code) return product.code;
    if (product.category?.smsPaymentName) return product.category.smsPaymentName;
    return product.name || '商品';
  }

  // 生成支付订单号
  generateOrderNo() {
    const now = new Date();
    const ts = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PAY${ts}${rand}`;
  }

  // 创建支付订单（调用支付宝预下单 alipay.trade.precreate）
  async createPayment(productId, contact, userId = null, couponCode = null, ip = null) {
    const productRepo = this.getProductRepo();
    const paymentRepo = this.getPaymentOrderRepo();
    const cardKeyRepo = this.getCardKeyRepo();

    // 查询商品（关联类别）
    const product = await productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) throw new Error('商品不存在');

    // 检查库存（可用卡密数量）
    const stock = await cardKeyRepo.count({ where: { productId, status: 'unused' } });
    if (stock <= 0) throw new Error('商品已售罄，暂无库存');

    // 计算优惠价格
    let finalAmount = parseFloat(product.price);
    let couponId = null;
    let couponInfo = null;

    if (couponCode) {
      const couponResult = await couponService.validateCoupon(couponCode, productId, product.price, userId, ip);
      if (couponResult.valid) {
        finalAmount = couponResult.finalAmount;
        couponId = couponResult.coupon.id;
        couponInfo = {
          code: couponResult.coupon.code,
          originalPrice: parseFloat(product.price),
          discount: couponResult.coupon.discount ? parseFloat(couponResult.coupon.discount) : null,
          deduction: couponResult.coupon.deduction ? parseFloat(couponResult.coupon.deduction) : null,
          finalAmount,
        };
      } else {
        throw new Error(couponResult.error);
      }
    }

    // 最低金额校验（支付宝要求 >= 0.01）
    if (finalAmount < 0.01) {
      finalAmount = 0.01;
    }

    // 创建支付订单
    const orderNo = this.generateOrderNo();
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟超时
    const displayName = this.getDisplayName(product);

    const paymentOrder = paymentRepo.create({
      orderNo,
      userId,
      productId,
      productName: displayName,
      amount: finalAmount,
      contact: contact || '',
      status: 'pending',
      expiredAt,
      couponId,
    });
    await paymentRepo.save(paymentOrder);

    // 调用支付宝当面付预下单接口
    try {
      const alipaySdk = getAlipaySdk();
      const bizContent = {
        out_trade_no: orderNo,
        total_amount: String(finalAmount),
        subject: displayName,
        timeout_express: '30m',
      };

      const notifyUrl = process.env.ALIPAY_NOTIFY_URL || undefined;
      const requestOptions = {
        bizContent,
        ...(notifyUrl ? { notifyUrl } : {}),
      };

      const result = await alipaySdk.exec('alipay.trade.precreate', requestOptions);

      if (result.code === '10000' && result.qrCode) {
        // 预下单成功，保存二维码
        await paymentRepo.update(paymentOrder.id, { qrCode: result.qrCode });

        // 生成支付链接（用于移动端直接拉起支付宝）
        const payUrl = `alipays://platformapi/startapp?appId=20000067&url=${encodeURIComponent(result.qrCode)}`;

        return {
          orderNo,
          qrCode: result.qrCode,
          payUrl, // 新增：移动端支付链接
          amount: finalAmount,
          originalAmount: couponInfo ? couponInfo.originalPrice : null,
          couponInfo,
          productName: displayName,
          expiredAt,
        };
      } else {
        const errMsg = result.subMsg || result.msg || '预下单失败';
        system.error('alipay.precreate', {
          error: errMsg,
          code: result.code,
          orderNo,
          productId,
        });
        throw new Error(errMsg);
      }
    } catch (error) {
      // 预下单失败
      await paymentRepo.update(paymentOrder.id, { status: 'failed' });
      const errMsg = error.subMsg || error.message || '未知错误';
      if (!errMsg.includes('预下单')) {
        system.error('alipay.precreate', {
          error: errMsg,
          orderNo,
          productId,
        });
      }
      throw new Error('创建支付订单失败: ' + errMsg);
    }
  }

  // 主动查询支付宝交易状态（alipay.trade.query）
  async queryAlipayTrade(orderNo) {
    try {
      const alipaySdk = getAlipaySdk();
      const result = await alipaySdk.exec('alipay.trade.query', {
        bizContent: { out_trade_no: orderNo },
      });

      if (result.code === '10000' && result.tradeStatus) {
        return {
          trade_status: result.tradeStatus,
          trade_no: result.tradeNo,
        };
      }
      return null;
    } catch (error) {
      console.warn('[PaymentService] 查询支付宝交易状态失败:', error.message);
      system.warn('查询支付宝交易状态失败', { error: error.message });
      return null;
    }
  }

  // 查询支付状态（前端轮询用）
  async queryPaymentStatus(orderNo) {
    const paymentRepo = this.getPaymentOrderRepo();
    const order = await paymentRepo.findOne({ where: { orderNo } });
    if (!order) throw new Error('订单不存在');

    // 如果还是 pending，主动查询支付宝
    if (order.status === 'pending') {
      const tradeInfo = await this.queryAlipayTrade(orderNo);
      if (tradeInfo) {
        const tradeStatus = tradeInfo.trade_status;
        if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
          await this.processPaymentSuccess(order, tradeInfo.trade_no || '', tradeInfo);
          // 重新查询更新后的订单
          const updatedOrder = await paymentRepo.findOne({ where: { orderNo } });
          return {
            orderNo: updatedOrder.orderNo,
            status: updatedOrder.status,
            amount: updatedOrder.amount,
            productName: updatedOrder.productName,
            cdKey: updatedOrder.cdKey,
            cardKeyId: updatedOrder.cardKeyId || null,
            paidAt: updatedOrder.paidAt,
          };
        }
      }
    }

    return {
      orderNo: order.orderNo,
      status: order.status,
      amount: order.amount,
      productName: order.productName,
      cdKey: order.status === 'paid' ? order.cdKey : null,
      cardKeyId: order.status === 'paid' ? (order.cardKeyId || null) : null,
      paidAt: order.paidAt,
    };
  }

  // 支付宝异步回调处理
  async handleNotify(params, ctx = {}) {
    const { ip } = ctx;
    // 验签
    const alipaySdk = getAlipaySdk();
    const verified = alipaySdk.checkNotifySignV2(params);
    if (!verified) {
      console.warn('[PaymentNotify] 验签失败');
      business.error('payment.callback', { reason: '验签失败', ip });
      return false;
    }

    const orderNo = params.out_trade_no;
    const tradeNo = params.trade_no;
    const tradeStatus = params.trade_status;

    const paymentRepo = this.getPaymentOrderRepo();
    const order = await paymentRepo.findOne({ where: { orderNo } });
    if (!order) {
      console.warn('[PaymentNotify] 订单不存在:', orderNo);
      business.warn('payment.callback', { orderNo, reason: '订单不存在', ip });
      return false;
    }

    // 已处理过的订单跳过
    if (order.status === 'paid') {
      return true;
    }

    // 支付成功
    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      await this.processPaymentSuccess(order, tradeNo, params, ctx);
    }

    return true;
  }

  // 创建接码服务支付订单（paySMS：不改卡密库存，只创建支付单）
  async createSmsPayment(cardKeyId, productId, contact, userId = null) {
    const paymentRepo = this.getPaymentOrderRepo();
    const productRepo = this.getProductRepo();

    // 查询商品（关联类别）
    const product = await productRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });

    // 从类别获取接码服务价格和显示名称
    const category = product?.category;
    const displayName = category?.smsPaymentName || product?.code || '增值服务';
    const amount = category?.smsPrice || 0.01;

    const orderNo = this.generateOrderNo();
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000);

    const paymentOrder = paymentRepo.create({
      orderNo,
      userId,
      productId,
      productName: displayName,
      amount,
      contact: contact || '',
      cardKeyId: cardKeyId || null,
      status: 'pending',
      expiredAt,
    });
    await paymentRepo.save(paymentOrder);

    // 调用支付宝预下单
    try {
      const alipaySdk = getAlipaySdk();
      const bizContent = {
        out_trade_no: orderNo,
        total_amount: String(amount),
        subject: displayName,
        timeout_express: '30m',
      };

      const notifyUrl = process.env.ALIPAY_NOTIFY_URL || undefined;
      const requestOptions = {
        bizContent,
        ...(notifyUrl ? { notifyUrl } : {}),
      };

      const result = await alipaySdk.exec('alipay.trade.precreate', requestOptions);

      if (result.code === '10000' && result.qrCode) {
        await paymentRepo.update(paymentOrder.id, { qrCode: result.qrCode });

        // 生成支付链接（用于移动端直接拉起支付宝）
        const payUrl = `alipays://platformapi/startapp?appId=20000067&url=${encodeURIComponent(result.qrCode)}`;

        return {
          orderNo,
          qrCode: result.qrCode,
          payUrl, // 新增：移动端支付链接
          amount,
          productName: displayName,
          expiredAt,
        };
      } else {
        throw new Error(result.subMsg || result.msg || '预下单失败');
      }
    } catch (error) {
      await paymentRepo.update(paymentOrder.id, { status: 'failed' });
      const errMsg = error.subMsg || error.message || '未知错误';
      throw new Error('创建支付订单失败: ' + errMsg);
    }
  }

  // 支付成功处理：区分普通商品和接码服务
  async processPaymentSuccess(order, tradeNo, notifyData, ctx = {}) {
    const { ip } = ctx;
    const paymentRepo = this.getPaymentOrderRepo();
    const cardKeyRepo = this.getCardKeyRepo();

    // 判断是否为接码服务支付：cardKeyId 有值但 cdK 为空（普通商品支付成功后才分配卡密）
    const isSmsPayment = !!(order.cardKeyId && !order.cdKey);

    const updateData = {
      tradeNo: tradeNo || '',
      status: 'paid',
      paidAt: new Date(),
      notifyData: typeof notifyData === 'string' ? notifyData : JSON.stringify(notifyData),
    };

    await paymentRepo.update(order.id, updateData);
    console.log(`[Payment] 订单 ${order.orderNo} 支付成功（${isSmsPayment ? '接码服务' : '普通商品'}）`);

    // 使用优惠码（如果有）
    if (order.couponId) {
      couponService.useCoupon(order.couponId);
    }
    business.success('payment.alipay', {
      orderNo: order.orderNo,
      tradeNo,
      amount: order.amount,
      type: isSmsPayment ? '接码服务' : '普通商品',
      userId: order.userId || null,
      ip: ip || null,
      payMethod: 'alipay',
    });

    if (isSmsPayment) {
      // 接码服务支付成功：将原 Order 的 status 改为 completed，允许再次接码（不新建订单）
      try {
        const orderRepo = dataSource.getRepository(Order);
        const cardKeyId = order.cardKeyId;

        if (cardKeyId) {
          const originalOrder = await orderRepo.findOne({
            where: { cardKeyId },
            order: { id: 'DESC' },
          });
          if (originalOrder) {
            await orderRepo.update(originalOrder.id, { status: 'completed', completedAt: new Date() });
            console.log(`[Payment] 接码服务支付成功，Order #${originalOrder.id} status→completed`);
            business.success('payment.sms', {
              orderNo: order.orderNo,
              ip: ip || null,
            });
          }
        }
      } catch (e) {
        console.warn('[Payment] 更新接码订单状态失败:', e.message);
        system.warn('更新接码订单状态失败', { error: e.message });
      }
    } else {
      // 普通商品支付：使用事务+行锁分配卡密（防止并发超卖）
      try {
        await dataSource.transaction(async (transactionalEntityManager) => {
          // 加行锁查询卡密（悲观锁，防止并发）
          const cardKey = await transactionalEntityManager.findOne(CardKey, {
            where: { productId: order.productId, status: 'unused' },
            lock: { mode: 'pessimistic_write' },
          });

          if (!cardKey) {
            // 无可用卡密：记录异常日志，便于客服处理退款
            business.error('payment.allocate', {
              orderNo: order.orderNo,
              amount: order.amount,
              tradeNo: tradeNo,
              userId: order.userId || null,
              ip: ip || null,
              severity: 'HIGH',
              actionRequired: '需要人工退款',
            });
            throw new Error('商品已售罄，请联系客服退款');
          }

          // 原子操作：分配卡密
          await transactionalEntityManager.update(CardKey, cardKey.id, {
            status: 'used',
            usedAt: new Date(),
          });
          await transactionalEntityManager.update(PaymentOrder, order.id, {
            cardKeyId: cardKey.id,
            cdKey: cardKey.CDK,
          });

          console.log(`[Payment] 订单 ${order.orderNo} 分配卡密 ${cardKey.code}`);
          business.success('cardkey.allocate', {
            orderNo: order.orderNo,
            cardKeyId: cardKey.id,
            productId: order.productId,
            productName: order.productName || null,
            amount: order.amount || null,
            userId: order.userId || null,
            contact: order.contact || null,
            ip: ip || null,
          });

          // 同步创建 Order 记录（在事务内执行，保证一致性）
          const orderRepo = transactionalEntityManager.getRepository(Order);
          const existing = await orderRepo.findOne({ where: { cardKeyId: cardKey.id } });
          if (!existing) {
            const now = new Date();
            const ts = now.getFullYear().toString() +
              (now.getMonth() + 1).toString().padStart(2, '0') +
              now.getDate().toString().padStart(2, '0') +
              now.getHours().toString().padStart(2, '0') +
              now.getMinutes().toString().padStart(2, '0') +
              now.getSeconds().toString().padStart(2, '0');
            const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

            await orderRepo.save(orderRepo.create({
              orderNo: `ORD${ts}${rand}`,
              userId: order.userId || null,
              cardKeyId: cardKey.id,
              productId: order.productId,
              amount: order.amount,
              payMethod: 'alipay',
              tradeNo: tradeNo || order.orderNo,
              contact: order.contact || '',
              status: 'completed',
              completedAt: new Date(),
            }));
            console.log(`[Payment] 已同步创建 Order 记录，关联支付单 ${order.orderNo}`);
            business.success('order.create', {
              orderNo: order.orderNo,
              payMethod: 'alipay',
              tradeNo,
              amount: order.amount || null,
              userId: order.userId || null,
              ip: ip || null,
            });
          }
        });

        // 事务成功后更新销量（非关键操作，放在事务外）
        try {
          const productRepo = this.getProductRepo();
          await productRepo.increment({ id: order.productId }, 'sales', 1);
        } catch (e) {
          console.warn('[Payment] 更新商品销量失败:', e.message);
          system.warn('更新商品销量失败', { error: e.message, productId: order.productId });
        }
      } catch (error) {
        // 事务失败或无卡密
        console.error('[Payment] 分配卡密失败:', error.message);
        system.error('分配卡密失败', { error: error.message, orderNo: order.orderNo });

        // 更新订单状态为异常，便于后续处理
        await paymentRepo.update(order.id, { status: 'failed' });

        throw error;
      }
    }
  }

  // 关闭超时订单
  async closeExpiredOrders() {
    const paymentRepo = this.getPaymentOrderRepo();
    const expiredOrders = await paymentRepo.find({
      where: { status: 'pending' },
    });

    const now = new Date();
    let closed = 0;
    for (const order of expiredOrders) {
      if (order.expiredAt && new Date(order.expiredAt) < now) {
        await paymentRepo.update(order.id, { status: 'expired' });
        closed++;
      }
    }
    return closed;
  }
}

module.exports = new PaymentService();
