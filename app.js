// 加载环境变量
require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const dataSource = require('./config/database');
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');
const pickupRouter = require('./routes/pickup');
const adminRouter = require('./routes/admin');
const paymentRouter = require('./routes/payment');
const adminRateLimitsRouter = require('./routes/adminRateLimits');
const logsRouter = require('./routes/logs');
const adminService = require('./services/adminService');
const rateLimitService = require('./services/rateLimitService');
const limiters = require('./middleware/rateLimiter');

// 日志系统
const { requestLogger, errorLogger } = require('./logger/middleware');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 5100;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // 解析 Cookie

// 请求日志中间件（必须在路由之前）
app.use(requestLogger);

// 全局速率限制
app.use('/api', limiters.global);

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'asset')));

// 路由
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/pickup', pickupRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/rate-limits', adminRateLimitsRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/admin/logs', logsRouter);

// 主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// 订单中心
app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

// 后台管理页（原版）
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// 后台管理页（Element Plus 版）
app.get('/admin/element', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index-element.html'));
});
app.get('/admin/login-element', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login-element.html'));
});


// 错误日志中间件（必须在所有路由之后）
app.use(errorLogger);

// 全局错误处理中间件（必须最后）
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';

  // 记录错误
  logger.error('全局错误处理', {
    error: message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    statusCode,
  });

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 初始化数据库并启动
async function bootstrap() {
  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 等待表同步完成（开发环境）
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 初始化默认管理员
    const initResult = await adminService.initDefaultAdmin();
    if (initResult) {
      console.log('🔑 默认管理员已创建 — 用户名: admin, 密码: admin123');
    }

    // 初始化默认速率限制配置
    try {
      await rateLimitService.initializeDefaults();
      console.log('🛡️ 速率限制已启用');
    } catch (error) {
      console.log('⚠️  速率限制配置初始化失败（将在首次访问时自动创建）');
    }

    app.listen(PORT, () => {
      console.log(`🛒 在线商品小站已启动: http://localhost:${PORT}`);
      console.log(`🔧 后台管理（原版）: http://localhost:${PORT}/admin`);
      console.log(`🎨 后台管理（Element Plus）: http://localhost:${PORT}/admin/element`);
    });
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

bootstrap();