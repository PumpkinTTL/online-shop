const dataSource = require('../config/database');
const Product = require('../entities/Product');
const CardKey = require('../entities/CardKey');

class ProductService {
  getRepository() {
    return dataSource.getRepository(Product);
  }

  getCardKeyRepo() {
    return dataSource.getRepository(CardKey);
  }

  normalizeProduct(product) {
    if (!product) return product;

    const categoryCode = product.category?.code || '';
    product.isCode = categoryCode === 'SMS';
    product.type = categoryCode ? categoryCode.toLowerCase() : 'uncategorized';
    product.smKeyWord = product.category?.smKeyWord || '';
    product.smsPrice = product.category?.smsPrice || null;
    product.smsPaymentName = product.category?.smsPaymentName || '';
    return product;
  }

  // 计算商品库存（基于未使用的卡密数量）
  async calcStock(productId) {
    const cardKeyRepo = this.getCardKeyRepo();
    const count = await cardKeyRepo.count({ where: { productId, status: 'unused' } });
    return count;
  }

  // 给商品附加实时库存
  async attachStock(product) {
    if (!product) return product;
    product.stock = await this.calcStock(product.id);
    return this.normalizeProduct(product);
  }

  async findAll() {
    const products = await this.getRepository().find({ relations: ['category'] });
    // 并行计算所有商品库存
    await Promise.all(products.map(p => this.attachStock(p)));
    return products;
  }

  // 前台可见商品（show=1）
  async findVisible() {
    const products = await this.getRepository().find({
      where: { show: 1 },
      relations: ['category'],
    });
    await Promise.all(products.map(p => this.attachStock(p)));
    return products;
  }

  async findOne(id) {
    const product = await this.getRepository().findOne({
      where: { id },
      relations: ['category'],
    });
    return this.attachStock(product);
  }

  async create(data) {
    // 创建时忽略 stock 字段（由卡密决定）
    delete data.stock;
    const entity = this.getRepository().create(data);
    return this.getRepository().save(entity);
  }

  async update(id, data) {
    const product = await this.getRepository().findOne({ where: { id } });
    if (!product) return null;
    // 更新时忽略 stock 字段（由卡密决定）
    delete data.stock;
    Object.assign(product, data);
    const saved = await this.getRepository().save(product);
    return this.attachStock(saved);
  }

  async delete(id) {
    const product = await this.getRepository().findOne({ where: { id } });
    if (!product) return false;
    await this.getRepository().remove(product);
    return true;
  }
}

module.exports = new ProductService();
