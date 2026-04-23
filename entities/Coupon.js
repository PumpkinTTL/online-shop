const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Coupon',
  tableName: 'coupons',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    code: { type: 'varchar', length: 64, unique: true },
    productId: { type: 'int', nullable: true }, // null = 全部商品
    discount: { type: 'decimal', precision: 5, scale: 2, nullable: true }, // 百分比折扣，如 10 表示减10%
    deduction: { type: 'decimal', precision: 10, scale: 2, nullable: true }, // 固定抵扣金额
    maxUses: { type: 'int', nullable: true }, // 最大使用次数（null=无限）
    usedCount: { type: 'int', default: 0 },
    validFrom: { type: 'datetime', nullable: true },
    validTo: { type: 'datetime', nullable: true },
    userId: { type: 'int', nullable: true }, // 限定使用者（null=不限）
    bindIp: { type: 'varchar', length: 45, nullable: true }, // 限定IP（null=不限）
    requireLogin: { type: 'boolean', default: false }, // 需要登录才能使用
    status: { type: 'varchar', length: 20, default: 'active' }, // active / disabled / expired
    createdAt: { type: 'datetime', createDate: true },
  },
});
