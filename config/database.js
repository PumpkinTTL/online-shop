const { DataSource } = require('typeorm');
const Product = require('../entities/Product');
const User = require('../entities/User');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const Admin = require('../entities/Admin');

const dataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'online_shop',
  entities: [Product, User, CardKey, Order, Admin],
  synchronize: true,
  logging: false,
});

module.exports = dataSource;
