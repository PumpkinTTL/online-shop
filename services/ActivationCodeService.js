const crypto = require('crypto');
const dataSource = require('../config/database');
const ActivationCode = require('../entities/ActivationCode');

class ActivationCodeService {
  getRepository() {
    return dataSource.getRepository(ActivationCode);
  }

  // 生成单个激活码
  generateCode(prefix = '') {
    const random = crypto.randomBytes(8).toString('hex').toUpperCase();
    return prefix ? `${prefix}-${random}` : random;
  }

  // 批量生成激活码
  async generate({ type, count = 1, prefix = '', remark = '', expiredAt = null }) {
    const validTypes = ['invite', 'coupon'];
    if (!validTypes.includes(type)) {
      throw new Error(`无效的激活码类型，可选: ${validTypes.join(', ')}`);
    }

    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = this.generateCode(prefix);
      codes.push(this.getRepository().create({
        code,
        type,
        status: 'unused',
        remark: remark || null,
        expiredAt: expiredAt ? new Date(expiredAt) : null,
      }));
    }

    const saved = await this.getRepository().save(codes);
    return saved;
  }

  // 验证激活码
  async validate(code, type = 'invite') {
    const record = await this.getRepository().findOne({ where: { code } });
    if (!record) {
      throw new Error('激活码不存在');
    }
    if (record.type !== type) {
      throw new Error('激活码类型不匹配');
    }
    if (record.status !== 'unused') {
      throw new Error('激活码已被使用');
    }
    if (record.expiredAt && new Date(record.expiredAt) < new Date()) {
      throw new Error('激活码已过期');
    }
    return record;
  }

  // 使用激活码
  async use(code, userId, type = 'invite') {
    const record = await this.validate(code, type);
    record.status = 'used';
    record.usedBy = userId;
    record.usedAt = new Date();
    await this.getRepository().save(record);
    return record;
  }

  // 分页查询
  async list({ page = 1, pageSize = 20, type = '', status = '' } = {}) {
    const where = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [items, total] = await this.getRepository().findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  // 删除
  async delete(id) {
    const result = await this.getRepository().delete(id);
    return result.affected > 0;
  }

  // 批量删除
  async batchDelete(ids) {
    const result = await this.getRepository().delete(ids);
    return result.affected;
  }
}

module.exports = new ActivationCodeService();
