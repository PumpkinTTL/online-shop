// 加载环境变量
require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const dataSource = require('./config/database');
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');
const pickupRouter = require('./routes/pickup');
const adminRouter = require('./routes/admin');
const paymentRouter = require('./routes/payment');
const adminRateLimitsRouter = require('./routes/adminRateLimits');
const logsRouter = require('./routes/logs');
const captchaRouter = require('./routes/captcha');
const adminService = require('./services/adminService');
const rateLimitService = require('./services/rateLimitService');
const limiters = require('./middleware/rateLimiter');

// 日志系统
const { requestLogger, errorLogger } = require('./logger/middleware');
const { system } = require('./logger');

const app = express();
const PORT = process.env.PORT || 5100;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false, // 前端使用内联脚本，暂时禁用CSP
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
}));

// CORS 配置：只允许同源访问（生产环境可配置允许的域名）
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5100')
    : true, // 开发环境允许所有来源
  credentials: true,
}));

// 中间件
app.use(express.json({ limit: '1mb' })); // 限制请求体大小
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(process.env.JWT_SECRET)); // 解析 Cookie（启用签名）

// 请求日志中间件（必须在路由之前）
app.use(requestLogger);

// 验证码路由（必须在全球限流之前，否则限流时无法获取验证码）
app.use('/api/captcha', captchaRouter);

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

// 后台管理（Element Plus 版）
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index-element.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login-element.html'));
});
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
  system.error('全局错误处理', {
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

    system.info('app.start', {
      message: '数据库连接成功',
      env: process.env.NODE_ENV || 'development',
    });

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
      console.log(`🎨 后台管理: http://localhost:${PORT}/admin`);

      system.info('app.start', {
        message: '服务启动成功',
        port: PORT,
        env: process.env.NODE_ENV || 'development',
      });
    });
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);

    system.error('app.start', {
      message: '数据库连接失败',
      error: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
}

bootstrap();