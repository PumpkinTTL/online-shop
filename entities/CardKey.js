const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'CardKey',
  tableName: 'card_keys',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    code: { type: 'varchar', length: 64, unique: true },
    type: { type: 'varchar', length: 20, default: 'cardkey' }, // cardkey / coupon
    productId: { type: 'int', nullable: true }, // 优惠码可以为 null（全场通用）
    phone: { type: 'varchar', length: 20, nullable: true },
    keyword: { type: 'varchar', length: 100, nullable: true },
    CDK: { type: 'varchar', length: 32, nullable: true },
    status: { type: 'varchar', length: 20, default: 'unused' }, // unused / used / expired / active / disabled
    // 优惠码专用字段（type=coupon 时使用）
    discount: { type: 'decimal', precision: 5, scale: 2, nullable: true }, // 百分比折扣，如 10 表示打9折
    deduction: { type: 'decimal', precision: 10, scale: 2, nullable: true }, // 固定抵扣金额，如 5.00 表示减5元
    maxUses: { type: 'int', nullable: true }, // 最大使用次数（null=无限）
    usedCount: { type: 'int', default: 0 }, // 已使用次数
    validFrom: { type: 'datetime', nullable: true }, // 生效时间
    validTo: { type: 'datetime', nullable: true }, // 过期时间
    userId: { type: 'int', nullable: true }, // 绑定用户ID（null=不限）
    bindIp: { type: 'varchar', length: 45, nullable: true }, // 绑定IP（null=不限）
    createdAt: { type: 'datetime', createDate: true },
    usedAt: { type: 'datetime', nullable: true },
  },
});
