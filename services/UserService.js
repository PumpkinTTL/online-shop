const bcrypt = require('bcryptjs');
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

  async findByUsername(username) {
    return this.getRepository().findOne({ where: { username } });
  }

  // 注册用户
  async register(username, password) {
    // 检查用户名是否已存在
    const existingUser = await this.findByUsername(username);
    if (existingUser) {
      throw new Error('用户名已存在');
    }
    
    // 加密密码并创建用户
    const hash = await this.hashPassword(password);
    const user = this.getRepository().create({
      username,
      password: hash,
      nickname: username // 默认昵称等于用户名
    });
    return this.getRepository().save(user);
  }

  // 登录验证
  async login(username, password) {
    const user = await this.findByUsername(username);
    if (!user) {
      throw new Error('用户名或密码错误');
    }
    
    const isValid = await this.comparePassword(password, user.password);
    if (!isValid) {
      throw new Error('用户名或密码错误');
    }
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userInfo } = user;
    return userInfo;
  }

  async create(data) {
    const entity = this.getRepository().create(data);
    return this.getRepository().save(entity);
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

  // 修改密码
  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.findOne(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证原密码
    const isValid = await this.comparePassword(oldPassword, user.password);
    if (!isValid) {
      throw new Error('原密码错误');
    }

    // 加密新密码
    const hash = await this.hashPassword(newPassword);
    user.password = hash;
    await this.getRepository().save(user);
  }
}

module.exports = new UserService();
