const dataSource = require('../config/database');
const Announcement = require('../entities/Announcement');

class AnnouncementService {
  getRepo() {
    return dataSource.getRepository(Announcement);
  }

  async getActiveAnnouncements() {
    const repo = this.getRepo();
    const now = new Date();
    return repo.createQueryBuilder('a')
      .where('a.isActive = :active', { active: true })
      .andWhere('(a.startTime IS NULL OR a.startTime <= :now)', { now })
      .andWhere('(a.endTime IS NULL OR a.endTime >= :now)', { now })
      .orderBy('a.isPinned', 'DESC')
      .addOrderBy('a.createdAt', 'DESC')
      .getMany();
  }

  async getAnnouncements({ type, isActive, page = 1, pageSize = 20 }) {
    const repo = this.getRepo();
    const where = {};
    if (type) where.type = type;
    if (isActive !== undefined && isActive !== null && isActive !== '') where.isActive = isActive === 'true' || isActive === true;

    const [items, total] = await repo.findAndCount({
      where,
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }

  async createAnnouncement(data) {
    const repo = this.getRepo();
    if (!data.title || !data.title.trim()) throw new Error('标题不能为空');
    if (!data.content || !data.content.trim()) throw new Error('内容不能为空');
    const validTypes = ['info', 'warning', 'error', 'success'];
    if (data.type && !validTypes.includes(data.type)) throw new Error('无效的公告类型');

    const entity = repo.create({
      title: data.title.trim(),
      content: data.content.trim(),
      type: data.type || 'info',
      isActive: data.isActive !== undefined ? data.isActive : true,
      isPinned: data.isPinned || false,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
    });
    return repo.save(entity);
  }

  async updateAnnouncement(id, data) {
    const repo = this.getRepo();
    const announcement = await repo.findOne({ where: { id } });
    if (!announcement) throw new Error('公告不存在');

    if (data.title !== undefined) {
      if (!data.title.trim()) throw new Error('标题不能为空');
      announcement.title = data.title.trim();
    }
    if (data.content !== undefined) {
      if (!data.content.trim()) throw new Error('内容不能为空');
      announcement.content = data.content.trim();
    }
    if (data.type !== undefined) announcement.type = data.type;
    if (data.isActive !== undefined) announcement.isActive = data.isActive;
    if (data.isPinned !== undefined) announcement.isPinned = data.isPinned;
    if (data.startTime !== undefined) announcement.startTime = data.startTime ? new Date(data.startTime) : null;
    if (data.endTime !== undefined) announcement.endTime = data.endTime ? new Date(data.endTime) : null;

    return repo.save(announcement);
  }

  async deleteAnnouncement(id) {
    const repo = this.getRepo();
    const announcement = await repo.findOne({ where: { id } });
    if (!announcement) throw new Error('公告不存在');
    await repo.remove(announcement);
    return true;
  }

  async batchDeleteAnnouncements(ids) {
    const repo = this.getRepo();
    const result = await repo.delete(ids);
    return result.affected || 0;
  }
}

module.exports = new AnnouncementService();
