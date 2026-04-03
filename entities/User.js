const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    username: { type: 'varchar', length: 50, unique: true },
    password: { type: 'varchar', length: 255 },
    nickname: { type: 'varchar', length: 50, nullable: true },
    avatar: { type: 'varchar', length: 500, nullable: true },
    isActive: { type: 'tinyint', default: 1 },
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
});
