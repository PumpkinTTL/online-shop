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
    stock: { type: 'int', default: 0 },
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
});
