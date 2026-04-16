const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'RateLimitConfig',
  tableName: 'rate_limit_configs',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true
    },
    key: {
      type: 'varchar',
      length: 50,
      unique: true,
      comment: '配置键名（global, login, payment, api, admin）'
    },
    name: {
      type: 'varchar',
      length: 50,
      comment: '配置名称'
    },
    windowMs: {
      type: 'int',
      comment: '时间窗口（毫秒）'
    },
    maxRequests: {
      type: 'int',
      comment: '最大请求数'
    },
    message: {
      type: 'text',
      nullable: true,
      comment: '限制提示信息'
    },
    enabled: {
      type: 'boolean',
      default: true,
      comment: '是否启用'
    },
    createdAt: {
      type: 'timestamp',
      createDate: true
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true
    }
  }
});
