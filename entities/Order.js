const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Order',
  tableName: 'orders',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    orderNo: { type: 'varchar', length: 64, unique: true },
    userId: { type: 'int', nullable: true }, // 关联用户ID，已登录时自动填入
    cardKeyId: { type: 'int', nullable: true },
    productId: { type: 'int' },
    contact: { type: 'varchar', length: 100 }, // 联系方式（手机号/邮箱/QQ等）
    phone: { type: 'varchar', length: 20, nullable: true }, // 接码手机号
    verifyCode: { type: 'varchar', length: 20, nullable: true }, // 验证码
    status: { type: 'varchar', length: 20, default: 'pending' }, // pending / completed / failed
    remark: { type: 'varchar', length: 500, nullable: true },
    createdAt: { type: 'datetime', createDate: true },
    completedAt: { type: 'datetime', nullable: true },
  },
});
