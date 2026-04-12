const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'PaymentOrder',
  tableName: 'payment_orders',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    orderNo: { type: 'varchar', length: 64, unique: true },       // 商户订单号
    tradeNo: { type: 'varchar', length: 64, nullable: true },      // 支付宝交易号
    productId: { type: 'int' },                                     // 商品ID
    productName: { type: 'varchar', length: 200 },                  // 商品名称（快照）
    amount: { type: 'decimal', precision: 10, scale: 2 },          // 支付金额
    qrCode: { type: 'varchar', length: 500, nullable: true },      // 支付宝二维码链接
    contact: { type: 'varchar', length: 100, nullable: true },     // 联系方式
    status: { type: 'varchar', length: 20, default: 'pending' },   // pending/paid/expired/closed/refunded
    paidAt: { type: 'datetime', nullable: true },                   // 支付时间
    expiredAt: { type: 'datetime', nullable: true },                // 过期时间
    notifyData: { type: 'text', nullable: true },                   // 支付宝回调原始数据
    cardKeyId: { type: 'int', nullable: true },                     // 关联卡密ID（支付成功后分配）
    cdKey: { type: 'varchar', length: 200, nullable: true },       // 兑换码（支付成功后分配）
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
});
