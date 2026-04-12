const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const dataSource = require('./config/database');
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');
const pickupRouter = require('./routes/pickup');
const adminRouter = require('./routes/admin');
const adminService = require('./services/adminService');

const app = express();
const PORT = 5100;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // 解析 Cookie

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'asset')));

// 路由
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
app.use('/api/pickup', pickupRouter);
app.use('/api/admin', adminRouter);

// 主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 提货页
app.get('/pickup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pickup.html'));
});

// 订单中心
app.get('/orders', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

// 后台管理页
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

// 初始化数据库并启动
async function bootstrap() {
  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    // 初始化默认管理员
    const initResult = await adminService.initDefaultAdmin();
    if (initResult) {
      console.log('🔑 默认管理员已创建 — 用户名: admin, 密码: admin123');
    }

    app.listen(PORT, () => {
      console.log(`🛒 在线商品小站已启动: http://localhost:${PORT}`);
      console.log(`🔧 后台管理: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

bootstrap();