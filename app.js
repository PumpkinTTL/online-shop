const express = require('express');
const path = require('path');
const dataSource = require('./config/database');
const productsRouter = require('./routes/products');
const usersRouter = require('./routes/users');

const app = express();
const PORT = 5100;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'asset')));

// 路由
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);

// 主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 初始化数据库并启动
async function bootstrap() {
  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    app.listen(PORT, () => {
      console.log(`🛒 在线商品小站已启动: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
}

bootstrap();