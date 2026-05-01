const { DataSource } = require('typeorm');
const Product = require('../entities/Product');
const ProductCategory = require('../entities/ProductCategory');
const User = require('../entities/User');
const CardKey = require('../entities/CardKey');
const Order = require('../entities/Order');
const Admin = require('../entities/Admin');
const SmsRecord = require('../entities/SmsRecord');
const PaymentOrder = require('../entities/PaymentOrder');
const RateLimitConfig = require('../entities/RateLimitConfig');
const ActivationCode = require('../entities/ActivationCode');
const Coupon = require('../entities/Coupon');
const Announcement = require('../entities/Announcement');

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'online_shop',
  entities: [Product, ProductCategory, User, CardKey, Order, Admin, SmsRecord, PaymentOrder, RateLimitConfig, ActivationCode, Coupon, Announcement],
  synchronize: process.env.NODE_ENV === 'development' ? true : false,
  logging: false,
});

module.exports = dataSource;
