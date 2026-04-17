// 测试支付并发场景：模拟多个订单同时竞争最后一个卡密

const dataSource = require('../config/database');
const paymentService = require('../services/paymentService');
const CardKey = require('../entities/CardKey');
const PaymentOrder = require('../entities/PaymentOrder');
const Product = require('../entities/Product');

// 模拟支付订单
function createMockOrder(id, productId) {
  return {
    id: id,
    orderNo: `PAY_TEST_${id}`,
    productId: productId,
    productName: '测试商品',
    amount: 0.01,
    contact: `test${id}@example.com`,
    status: 'pending',
    cardKeyId: null,
    cdKey: null,
  };
}

async function runConcurrentTest() {
  console.log('🧪 开始并发支付测试...\n');

  await dataSource.initialize();

  const cardKeyRepo = dataSource.getRepository(CardKey);
  const paymentRepo = dataSource.getRepository(PaymentOrder);
  const productRepo = dataSource.getRepository(Product);

  try {
    // 1. 准备测试数据：创建1个测试商品和1个可用卡密
    console.log('📦 准备测试数据...');

    // 查找或创建测试商品
    let product = await productRepo.findOne({ where: { name: '并发测试商品' } });
    if (!product) {
      product = productRepo.create({
        name: '并发测试商品',
        price: 0.01,
        show: 0, // 前台不显示
      });
      await productRepo.save(product);
      console.log(`   创建测试商品 #${product.id}`);
    }

    // 清理该商品的旧卡密
    await cardKeyRepo.delete({ productId: product.id });
    console.log(`   清理旧卡密`);

    // 只创建1个卡密（模拟库存=1）
    const testCardKey = cardKeyRepo.create({
      productId: product.id,
      code: `TEST_${Date.now()}`,
      CDK: `CDK_${Date.now()}`,
      status: 'unused',
    });
    await cardKeyRepo.save(testCardKey);
    console.log(`   创建1个测试卡密: ${testCardKey.code}\n`);

    // 2. 模拟3个并发支付回调，竞争这1个卡密
    console.log('⚡ 模拟3个订单同时支付回调...\n');

    const orders = [
      createMockOrder(1001, product.id),
      createMockOrder(1002, product.id),
      createMockOrder(1003, product.id),
    ];

    // 并发执行（模拟支付宝同时回调3次）
    const results = await Promise.allSettled([
      paymentService.processPaymentSuccess(orders[0], 'ALIPAY_001', {}),
      paymentService.processPaymentSuccess(orders[1], 'ALIPAY_002', {}),
      paymentService.processPaymentSuccess(orders[2], 'ALIPAY_003', {}),
    ]);

    // 3. 检查结果
    console.log('📊 测试结果：\n');

    let successCount = 0;
    let failedCount = 0;
    let allocatedCardKey = null;

    results.forEach((result, index) => {
      const orderNo = orders[index].orderNo;
      if (result.status === 'fulfilled') {
        successCount++;
        console.log(`   ✅ 订单 ${orderNo}: 成功`);
      } else {
        failedCount++;
        console.log(`   ❌ 订单 ${orderNo}: 失败 - ${result.reason.message}`);
      }
    });

    console.log(`\n   成功: ${successCount}, 失败: ${failedCount}\n`);

    // 4. 验证卡密只分配给了1个订单
    const updatedCardKey = await cardKeyRepo.findOne({
      where: { code: testCardKey.code },
    });

    console.log('🔍 验证卡密状态：');
    console.log(`   卡密: ${updatedCardKey.code}`);
    console.log(`   状态: ${updatedCardKey.status}`);
    console.log(`   使用时间: ${updatedCardKey.usedAt}\n`);

    // 5. 最终结论
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (updatedCardKey.status === 'used' && successCount === 1 && failedCount === 2) {
      console.log('✅ 测试通过！卡密只分配给了1个订单，其他订单正确失败');
      console.log('   不会出现"付了钱没卡密"的问题');
    } else if (successCount > 1) {
      console.log('❌ 测试失败！多个订单都成功，可能存在超卖');
    } else {
      console.log('⚠️  测试结果异常，请检查日志');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ 测试出错:', error.message);
    console.error(error.stack);
  } finally {
    await dataSource.destroy();
  }
}

// 运行测试
runConcurrentTest().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
