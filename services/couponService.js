const dataSource = require('../config/database');
const Coupon = require('../entities/Coupon');

class CouponService {
  getCouponRepo() {
    return dataSource.getRepository(Coupon);
  }

  // 生成随机码
  generateCode(prefix) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const gen5 = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return (prefix || '') + gen5() + '-' + gen5();
  }

  // 获取优惠码列表
  async getCoupons({ status, page, pageSize }) {
    const repo = this.getCouponRepo();
    const where = {};
    if (status) where.status = status;

    if (pageSize === 0) {
      const items = await repo.find({ where, order: { id: 'DESC' } });
      return items;
    }

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
    const repo = this.getCouponRepo();

    // 验证：discount 和 deduction 至少有一个
    if (!data.discount && !data.deduction) {
      throw new Error('折扣和抵扣至少填写一项');
    }
    // 如果都填了，优先用抵扣
    if (data.discount && data.deduction) {
      throw new Error('折扣和抵扣只能填写一项，不能同时设置');
    }
    // discount 范围校验：1-99
    if (data.discount && (data.discount < 1 || data.discount > 99)) {
      throw new Error('折扣范围 1-99（如 10 表示减10%）');
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
        code = 'CPN' + this.generateCode('');
        exists = await repo.findOne({ where: { code } });
      }
    } else {
      const exists = await repo.findOne({ where: { code } });
      if (exists) throw new Error('优惠码已存在');
    }

    const coupon = repo.create({
      code,
      productId: data.productId || null,
      discount: data.discount || null,
      deduction: data.deduction || null,
      maxUses: data.maxUses || null,
      usedCount: 0,
      validFrom: data.validFrom || null,
      validTo: data.validTo || null,
      userId: data.userId || null,
      bindIp: data.bindIp || null,
      requireLogin: data.requireLogin || false,
      status: 'active',
    });

    return repo.save(coupon);
  }

  // 批量生成优惠码
  async generateCoupons(data) {
    const repo = this.getCouponRepo();

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
        code = prefix + this.generateCode('');
        exists = await repo.findOne({ where: { code } });
      }

      entities.push(repo.create({
        code,
        productId: data.productId || null,
        discount: data.discount || null,
        deduction: data.deduction || null,
        maxUses: data.maxUses || null,
        usedCount: 0,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        userId: data.userId || null,
        bindIp: data.bindIp || null,
        requireLogin: data.requireLogin || false,
        status: 'active',
      }));
    }

    return repo.save(entities);
  }

  // 更新优惠码
  async updateCoupon(id, data) {
    const repo = this.getCouponRepo();
    const coupon = await repo.findOne({ where: { id } });
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
    const repo = this.getCouponRepo();
    const coupon = await repo.findOne({ where: { id } });
    if (!coupon) throw new Error('优惠码不存在');
    await repo.remove(coupon);
    return true;
  }

  // 批量删除优惠码
  async batchDeleteCoupons(ids) {
    const repo = this.getCouponRepo();
    const result = await repo.delete(ids);
    return result.affected || 0;
  }

  // ==================== 前台使用 ====================

  // 验证优惠码（供 paymentService 调用）
  async validateCoupon(code, productId, productPrice, userId, ip) {
    const repo = this.getCouponRepo();

    const coupon = await repo.findOne({ where: { code } });
    if (!coupon) return { valid: false, error: '优惠码不存在' };

    // 状态检查
    if (coupon.status === 'disabled') return { valid: false, error: '优惠码已禁用' };
    if (coupon.status === 'expired') return { valid: false, error: '优惠码已过期' };

    // 有效期检查
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return { valid: false, error: '优惠码尚未生效' };
    }
    if (coupon.validTo && new Date(coupon.validTo) < now) {
      await repo.update(coupon.id, { status: 'expired' });
      return { valid: false, error: '优惠码已过期' };
    }

    // 使用次数检查
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { valid: false, error: '优惠码已用完' };
    }

    // 商品匹配检查
    if (coupon.productId && coupon.productId !== productId) {
      return { valid: false, error: '该优惠码不适用于此商品' };
    }

    // 需要登录检查
    if (coupon.requireLogin && !userId) {
      return { valid: false, error: '该优惠码需要登录后使用' };
    }

    // 使用者检查
    if (coupon.userId && coupon.userId !== userId) {
      return { valid: false, error: '该优惠码不适用于当前用户' };
    }

    // IP检查
    if (coupon.bindIp && coupon.bindIp !== ip) {
      return { valid: false, error: '该优惠码不适用于当前IP' };
    }

    // 计算折后价
    const originalPrice = parseFloat(productPrice);
    let finalAmount = originalPrice;

    if (coupon.deduction) {
      finalAmount = originalPrice - parseFloat(coupon.deduction);
    } else if (coupon.discount) {
      finalAmount = originalPrice * (1 - parseFloat(coupon.discount) / 100);
    }

    finalAmount = Math.max(0, Math.round(finalAmount * 100) / 100);

    return { valid: true, coupon, finalAmount };
  }

  // 使用优惠码（支付成功后调用，递增计数）
  async useCoupon(couponId) {
    if (!couponId) return;
    const repo = this.getCouponRepo();
    try {
      const coupon = await repo.findOne({ where: { id: couponId } });
      if (!coupon) return;

      const newUsedCount = coupon.usedCount + 1;
      const updateData = { usedCount: newUsedCount };

      if (coupon.maxUses && newUsedCount >= coupon.maxUses) {
        updateData.status = 'expired';
      }

      await repo.update(couponId, updateData);
    } catch (e) {
      console.warn('[CouponService] useCoupon error:', e.message);
    }
  }
}

module.exports = new CouponService();
