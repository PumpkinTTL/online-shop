const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'CardKey',
  tableName: 'card_keys',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    code: { type: 'varchar', length: 64, unique: true },
    productId: { type: 'int', nullable: true },
    phone: { type: 'varchar', length: 20, nullable: true },
    keyword: { type: 'varchar', length: 100, nullable: true },
    CDK: { type: 'varchar', length: 32, nullable: true },
    status: { type: 'varchar', length: 20, default: 'unused' }, // unused / used / expired
    createdAt: { type: 'datetime', createDate: true },
    usedAt: { type: 'datetime', nullable: true },
  },
});
