const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'ProductCategory',
  tableName: 'product_categories',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    name: { type: 'varchar', length: 50, unique: true },
    code: { type: 'varchar', length: 20, unique: true },
    description: { type: 'varchar', length: 200, nullable: true },
    // isCode 商品专属属性（类别级别配置）
    smsPrice: { type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '接码额外费用' },
    smsPaymentName: { type: 'varchar', length: 100, nullable: true, comment: '接码支付显示名称' },
    smKeyWord: { type: 'varchar', length: 100, nullable: true, comment: '接码关键词' },
    // 其他属性
    sort: { type: 'int', default: 0, comment: '排序' },
    show: { type: 'int', default: 1, comment: '是否显示' },
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
});
