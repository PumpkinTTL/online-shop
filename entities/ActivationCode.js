const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'ActivationCode',
  tableName: 'activation_codes',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    code: { type: 'varchar', length: 50, unique: true },
    type: { type: 'varchar', length: 30 },
    status: { type: 'varchar', length: 20, default: 'unused' },
    usedBy: { type: 'int', nullable: true },
    usedAt: { type: 'datetime', nullable: true },
    remark: { type: 'varchar', length: 255, nullable: true },
    createdAt: { type: 'datetime', createDate: true },
    expiredAt: { type: 'datetime', nullable: true },
  },
});
