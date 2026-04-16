const dataSource = require('../config/database');
const RateLimitConfig = require('../entities/RateLimitConfig');

class RateLimitService {
  constructor() {
    this.defaultConfigs = [
      {
        key: 'global',
        name: '全局限速',
        windowMs: 60 * 1000,
        maxRequests: 100,
        message: '请求过于频繁，请稍后再试',
        enabled: true,
      },
      {
        key: 'login',
        name: '登录接口',
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        message: '登录失败次数过多，请15分钟后再试',
        enabled: true,
      },
      {
        key: 'payment',
        name: '支付接口',
        windowMs: 60 * 1000,
        maxRequests: 3,
        message: '支付请求过于频繁，请稍后再试',
        enabled: true,
      },
      {
        key: 'api',
        name: 'API接口',
        windowMs: 60 * 1000,
        maxRequests: 20,
        message: 'API请求过于频繁，请稍后再试',
        enabled: true,
      },
      {
        key: 'admin',
        name: '管理后台',
        windowMs: 15 * 60 * 1000,
        maxRequests: 10,
        message: '管理后台请求过于频繁',
        enabled: true,
      },
    ];
  }

  getRepository() {
    return dataSource.getRepository(RateLimitConfig);
  }

  getDefaultConfigs() {
    return this.defaultConfigs.map((config) => ({ ...config }));
  }

  getDefaultConfig(key) {
    return this.getDefaultConfigs().find((config) => config.key === key) || null;
  }

  normalizeConfig(config) {
    if (!config) {
      return null;
    }

    return {
      ...config,
      windowMs: Number(config.windowMs),
      maxRequests: Number(config.maxRequests),
      enabled: config.enabled !== false,
      message: config.message || '请求过于频繁，请稍后再试',
    };
  }

  validateUpdateData(data) {
    if (data.windowMs !== undefined) {
      const windowMs = Number(data.windowMs);
      if (!Number.isInteger(windowMs) || windowMs < 1000) {
        throw new Error('时间窗口必须是大于等于1000的整数毫秒值');
      }
      data.windowMs = windowMs;
    }

    if (data.maxRequests !== undefined) {
      const maxRequests = Number(data.maxRequests);
      if (!Number.isInteger(maxRequests) || maxRequests < 1) {
        throw new Error('最大请求数必须是大于等于1的整数');
      }
      data.maxRequests = maxRequests;
    }

    if (data.enabled !== undefined) {
      data.enabled = Boolean(data.enabled);
    }

    if (data.message !== undefined) {
      data.message = String(data.message).trim();
    }

    return data;
  }

  // 获取所有配置
  async findAll() {
    const configs = await this.getRepository().find({
      order: { id: 'ASC' },
    });
    return configs.map((config) => this.normalizeConfig(config));
  }

  // 根据key获取配置
  async findByKey(key) {
    const config = await this.getRepository().findOne({ where: { key } });
    return this.normalizeConfig(config);
  }

  // 获取生效配置（数据库优先，默认值兜底）
  async getEffectiveConfig(key) {
    const config = await this.findByKey(key);
    return config || this.getDefaultConfig(key);
  }

  // 更新配置
  async updateByKey(key, data) {
    const config = await this.getRepository().findOne({ where: { key } });
    if (!config) {
      throw new Error('配置不存在');
    }

    const normalizedData = this.validateUpdateData({ ...data });
    Object.assign(config, normalizedData);

    const saved = await this.getRepository().save(config);
    return this.normalizeConfig(saved);
  }

  // 初始化默认配置
  async initializeDefaults() {
    for (const config of this.getDefaultConfigs()) {
      const existing = await this.getRepository().findOne({ where: { key: config.key } });
      if (!existing) {
        await this.getRepository().save(this.getRepository().create(config));
      }
    }
  }

  async resetToDefaults() {
    const repository = this.getRepository();

    for (const config of this.getDefaultConfigs()) {
      const existing = await repository.findOne({ where: { key: config.key } });
      if (existing) {
        Object.assign(existing, config);
        await repository.save(existing);
      } else {
        await repository.save(repository.create(config));
      }
    }

    return this.findAll();
  }
}

module.exports = new RateLimitService();
