const { DataSource } = require('typeorm');
const Product = require('../entities/Product');
const User = require('../entities/User');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const Admin = require('../entities/Admin');
const SmsRecord = require('../entities/SmsRecord');
const PaymentOrder = require('../entities/PaymentOrder');

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'online_shop',
  entities: [Product, User, CardKey, Order, Admin, SmsRecord, PaymentOrder],
  synchronize: process.env.NODE_ENV === 'development' ? true : false,
  logging: false,
});

module.exports = dataSource;
