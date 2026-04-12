const { DataSource } = require('typeorm');
const Product = require('../entities/Product');
const User = require('../entities/User');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');

const dataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'online_shop',
  entities: [Product, User, CardKey, Order],
  synchronize: true,
  logging: false,
});

module.exports = dataSource;
