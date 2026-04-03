const dataSource = require('../config/database');
const Product = require('../entities/Product');

class ProductService {
  getRepository() {
    return dataSource.getRepository(Product);
  }

  async findAll() {
    return this.getRepository().find();
  }

  async findOne(id) {
    return this.getRepository().findOne({ where: { id } });
  }

  async create(data) {
    const entity = this.getRepository().create(data);
    return this.getRepository().save(entity);
  }

  async update(id, data) {
    const product = await this.findOne(id);
    if (!product) return null;
    Object.assign(product, data);
    return this.getRepository().save(product);
  }

  async delete(id) {
    const product = await this.findOne(id);
    if (!product) return false;
    await this.getRepository().remove(product);
    return true;
  }
}

module.exports = new ProductService();
