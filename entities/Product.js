const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Product',
  tableName: 'products',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    name: { type: 'varchar', length: 100 },
    code: { type: 'varchar', length: 100, nullable: true, comment: '商品代号（用于支付订单）' },
    price: { type: 'decimal', precision: 10, scale: 2 },
    description: { type: 'varchar', length: 500, nullable: true },
    image: { type: 'varchar', length: 500, nullable: true },
    categoryId: { type: 'int', nullable: true, comment: '商品类别ID' },
    sales: { type: 'int', default: 0 },
    warranty: { type: 'varchar', length: 200, nullable: true },
    credit: { type: 'int', nullable: true, comment: '积分额度（商品级别）' },
    tips: { type: 'varchar', length: 500, nullable: true },
    addr: { type: 'varchar', length: 500, nullable: true, comment: '兑换地址（CDK使用地址）' },
    show: { type: 'int', default: 1, comment: '是否在首页显示: 1显示 0隐藏' },
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
  relations: {
    category: {
      target: 'ProductCategory',
      type: 'many-to-one',
      joinColumn: { name: 'categoryId' },
    },
  },
});
