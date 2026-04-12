// 修复 sales 字段 NULL 值
const dataSource = require('../config/database');

async function fixSales() {
  try {
    await dataSource.initialize();
    console.log('数据库连接成功');

    // 更新所有 sales 为 NULL 的记录
    const result = await dataSource.query(
      'UPDATE products SET sales = 0 WHERE sales IS NULL'
    );
    
    console.log('修复完成，影响行数:', result.affectedRows || result.changedRows || 0);
    
    await dataSource.destroy();
    console.log('数据库连接已关闭');
  } catch (error) {
    console.error('修复失败:', error.message);
    process.exit(1);
  }
}

fixSales();
