const bcrypt = require('bcrypt');
const dataSource = require('../config/database');
const User = require('../entities/User');

const SALT_ROUNDS = 10;

class UserService {
  getRepository() {
    return dataSource.getRepository(User);
  }

  // 密码加密
  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  // 密码比对
  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  async findAll() {
    return this.getRepository().find();
  }

  async findOne(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  async findByEmail(email) {
    return this.getRepository().findOne({ where: { email } });
  }

  async create(data) {
    const entity = this.getRepository().create(data);
    return this.getRepository().save(entity);
  }

  async createWithPassword(email, password, nickname) {
    const hash = await this.hashPassword(password);
    return this.create({ email, password: hash, nickname });
  }

  async update(id, data) {
    const user = await this.findOne(id);
    if (!user) return null;
    Object.assign(user, data);
    return this.getRepository().save(user);
  }

  async delete(id) {
    const user = await this.findOne(id);
    if (!user) return false;
    await this.getRepository().remove(user);
    return true;
  }
}

module.exports = new UserService();
