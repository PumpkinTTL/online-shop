const dataSource = require('../config/database');

async function addProduct() {
  try {
    await dataSource.initialize();
    
    const productRepository = dataSource.getRepository('Product');
    
    const newProduct = {
      name: 'OpenClaw远程安装服务',
      price: 20.00,
      description: 'OpenClaw自托管网关远程安装配置服务，连接WhatsApp/Telegram/Discord等通讯应用与AI助手，支持多通道、多智能体路由、媒体文件传输，私有化部署，数据完全掌控',
      stock: 999
    };
    
    const product = productRepository.create(newProduct);
    await productRepository.save(product);
    
    console.log('商品添加成功:', product);
    
    await dataSource.destroy();
  } catch (error) {
    console.error('添加商品失败:', error);
    process.exit(1);
  }
}

addProduct();
