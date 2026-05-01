const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Announcement',
  tableName: 'announcements',
  columns: {
    id: { type: 'int', primary: true, generated: true },
    title: { type: 'varchar', length: 200 },
    content: { type: 'text' },
    type: { type: 'varchar', length: 20, default: 'info' },
    isActive: { type: 'boolean', default: true },
    isPinned: { type: 'boolean', default: false },
    startTime: { type: 'datetime', nullable: true },
    endTime: { type: 'datetime', nullable: true },
    createdAt: { type: 'datetime', createDate: true },
    updatedAt: { type: 'datetime', updateDate: true },
  },
});
