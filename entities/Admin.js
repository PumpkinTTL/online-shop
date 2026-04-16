const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Admin',
  tableName: 'admins',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    username: { type: 'varchar', length: 50, unique: true },
    password: { type: 'varchar', length: 255 },
    nickname: { type: 'varchar', length: 50, nullable: true },
    role: { type: 'varchar', length: 20, default: 'admin' }, // admin / super
    isActive: { type: 'tinyint', default: 1 },
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
});
