const { AlipaySdk } = require('alipay-sdk');

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID;
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY;
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY;

let alipaySdk = null;

function getAlipaySdk() {
  if (!alipaySdk) {
    if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY || !ALIPAY_PUBLIC_KEY) {
      throw new Error('支付宝配置不完整，请检查环境变量 ALIPAY_APP_ID、ALIPAY_PRIVATE_KEY、ALIPAY_PUBLIC_KEY');
    }
    alipaySdk = new AlipaySdk({
      appId: ALIPAY_APP_ID,
      privateKey: ALIPAY_PRIVATE_KEY,
      alipayPublicKey: ALIPAY_PUBLIC_KEY,
      keyType: 'PKCS8',
      signType: 'RSA2',
    });
  }
  return alipaySdk;
}

module.exports = { getAlipaySdk, ALIPAY_APP_ID, ALIPAY_PUBLIC_KEY };
