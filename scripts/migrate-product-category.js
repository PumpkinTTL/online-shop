// 数据迁移脚本：将商品表重构为商品+类别表

const dataSource = require('../config/database');
const Product = require('../entities/Product');
const ProductCategory = require('../entities/ProductCategory');

async function migrate() {
  await dataSource.initialize();
  console.log('✅ 数据库连接成功');

  const categoryRepo = dataSource.getRepository(ProductCategory);
  const productRepo = dataSource.getRepository(Product);

  // 1. 创建默认类别
  console.log('\n📦 创建默认类别...');

  const categories = [
    {
      name: 'AI绘画',
      code: 'AI',
      description: 'AI绘画类商品',
      sort: 1,
    },
    {
      name: '接码服务',
      code: 'SMS',
      description: '接码类商品（isCode）',
      smsPrice: 0.01,
      smsPaymentName: '增值服务',
      smKeyWord: '',
      sort: 2,
    },
  ];

  const createdCategories = {};
  for (const cat of categories) {
    const existing = await categoryRepo.findOne({ where: { code: cat.code } });
    if (!existing) {
      const created = await categoryRepo.save(categoryRepo.create(cat));
      createdCategories[cat.code] = created;
      console.log(`   创建类别: ${cat.name} (ID: ${created.id})`);
    } else {
      createdCategories[cat.code] = existing;
      console.log(`   类型已存在: ${cat.name} (ID: ${existing.id})`);
    }
  }

  // 2. 迁移现有商品数据
  console.log('\n🔄 迁移商品数据...');

  const products = await productRepo.find();
  console.log(`   找到 ${products.length} 个商品`);

  let migrated = 0;
  for (const product of products) {
    // 根据商品属性判断类别，积分仍保留在商品表
    let categoryId = null;

    if (product.smsPrice) {
      // 有接码价格 → 接码服务类别
      categoryId = createdCategories['SMS']?.id;

      // 保存原有属性到类别（如果类别中没有设置）
      const cat = createdCategories['SMS'];
      if (cat && !cat.smsPrice) {
        cat.smsPrice = product.smsPrice;
        cat.smsPaymentName = product.smsPaymentName;
        cat.smKeyWord = product.smKeyWord;
        await categoryRepo.save(cat);
      }
    } else {
      // 其他商品默认归到 AI 绘画类别，积分字段继续保留在商品自身
      categoryId = createdCategories['AI']?.id;
    }

    if (categoryId) {
      await productRepo.update(product.id, { categoryId });
      migrated++;
      console.log(`   商品 #${product.id} ${product.name} → 类别ID: ${categoryId}`);
    }
  }

  console.log(`\n✅ 迁移完成！`);
  console.log(`   创建类别: ${Object.keys(createdCategories).length}`);
  console.log(`   迁移商品: ${migrated}`);

  await dataSource.destroy();
}

migrate().then(() => {
  console.log('\n🎉 迁移成功！');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ 迁移失败:', err.message);
  console.error(err.stack);
  process.exit(1);
});
