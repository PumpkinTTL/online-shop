const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Product',
  tableName: 'products',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    name: { type: 'varchar', length: 100 },
    price: { type: 'decimal', precision: 10, scale: 2 },
    description: { type: 'varchar', length: 500, nullable: true },
    image: { type: 'varchar', length: 500, nullable: true },
    type: { type: 'varchar', length: 20, default: 'ai' },
    sales: { type: 'int', default: 0 },
    warranty: { type: 'varchar', length: 200, nullable: true },
    isCode: { type: 'tinyint', default: 0 },
    smKeyWord: { type: 'varchar', length: 100, nullable: true },
    addr: { type: 'varchar', length: 500, nullable: true },  // 兑换地址
    credit: { type: 'int', nullable: true },                   // 积分额度
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
});
