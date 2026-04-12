const { AlipaySdk } = require('alipay-sdk');

const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || '2021003139651097';
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || 'MIIEwAIBADANBgkqhkiG9w0BAQEFAASCBKowggSmAgEAAoIBAQDGVluoFsyunNyF311df0olk6k6r8zJiago5nfOS2Bu+cYQlziiu7Qqkxqu7/EIO39fGMv4Zz0yxQx/UIJgYF9QviQ7CJtlE8Ea9GZXaG2wodhm3JY6wBTrguiu9E6rPMAJtMaMBoGGyo2KDziS1XiOtFEJtbc+EpJaq+NJTw1B1OrYrSOqBuRvabuRn3N0ddeODGlUUcwSLTZTs+aK/enG1c9Rx9M9S1BfucA5kEYyWI1Vo79ixaWe0O84tRjeP6emHSPoye/LOp2MOM1P6+ByVKqrvO40vGFpKNeAuyaDx6c8gp8rTk0DXHZyZzyH8N4N/BQT3f5/URT81wIQg/4fAgMBAAECggEBAMWo0MVum2O1Xixok2KXdayHQRMEmqGLd7PzIxjLk/plIBfurPm4+O+pFOGcrGiY6vI6AyS2to2/RRoogRZNVRBhvje69yq/iiYzxT59CzwJv2GbmnhIb1DacMvTHAeZjoTdzTVFUpajjHU3gBkNd404dL6pg0nwNjz4qpWnm72rE5Ds3xkjkjpKnDoheOHyReBCXkZWLfN3x9AzrC3wa6V37atO45IV4kk4m5tHQKFoc/aYIcYFoLHOHvZmJK+QPLLlV33emLJZRZb9oLfeJRov5CQ8UrFk9cWtF9QgdExxDVRIZSpiL6xqLntePkrRi5vXEP/iQZ7d0B0sUJ40QEECgYEA4u07s+xv3ihJdZPGTZDEqJiMIINW3zbcZ4uIwInp5ATUYQohUx1t2NuVuxFz6HMnaydigk7H3Ik+RleO4Dxhnrjm7tkeED/57OG8LMRVrTaspk8A1gig6GC48RAklZECQ0vb/U1K1HPeGTYpuBbU2qSDDt6BINXGG82Jziue4f8CgYEA379yrMvDs9RxiUK0beP+Sk3J8nMKpEJt5ddF0dsqZamopc3HyDy1IwNtAOeFPjIMGYywZ4vUxqUDy6nuA5Xzu5CwkkOmD+pxpF6DOpZGpfdEc00/I2UqhfoThnfEiZFyQsFowYTOaUiVvbO43zwjCBkrZL+jD02pgMxyqbwGo+ECgYEAgVrWA5QtmKfCaCGakrCJScnbZtU3efod3XBuvcJf7zjJj59kq6pE6a8SRRaHyeOKfsxunPUnfJFHTHWw3iXNR9sC2Pgu6PhvERcEW0h3xks6U3sJcPhuMMih49hd4lxMu+vMNTIQC9cYrapwUZ3CK/hHNPylAwCY81RQz5OR+CUCgYEArvJ3zMpqU/LZb3S7tWzeiOS38Z2oBXV3jo47JnJSfTkiB7qV6mglTaJBGcLtOQtS0KtjxyLblRKznAxbcWxPLipdFZBViP5MKzRHMYkM5noniGwu4RMaI7W8jJibEOGr0Kx/p0ibSFEb3D9pXwsbbRqZBmadLbsQvQee5D6DhqECgYEA3crELp11LdSLo/QGkfs6zjCikD9RVxlJ9h+heEaLH2zQZyA8VE8hGHeBlak10aC78kfa8fpWee5ESfo/wyFJYoKDnw/vl6FTBApOkWMaoMzT3ZysYWZnQzwINuqunPN0rweYlcR4r1W3Dq8y4Bg2d0igTt+etQJhnxN2PVD1Fx8=';
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAiSPJSWcMxOH2GDlbhLT1Zmt95Zl1dLTSFheZXYSvcWfrsSqsIx4mLabEKP3RWB3iPO9Umn+m3Rp2z6hyLPlixq0jynun+vQPtan8ddWSQOoHWTH7ZMm6j+j9M6BFgU4K189vL2hxtPwd0xJWUwDlmm8RlnRWlSn/0/KobnxtDn+vORmmILrjEjwWQjP9KFLmpMPPDs/UottceJNeoMvljHXftHVYtQnE2/swhJqxs+QST2rXs39ir5kfUk4TyE0UyvLviEKA++Iw/6Xk9FNRr6h4fsRNbyxaKoMGTSqzF/WphKokrq5Rg55evwJSalAqorlJ/PGByOWXiGW6gySvqQIDAQAB';

let alipaySdk = null;

function getAlipaySdk() {
  if (!alipaySdk) {
    if (!ALIPAY_PRIVATE_KEY) {
      throw new Error('ALIPAY_PRIVATE_KEY 未配置，请在环境变量中设置应用私钥');
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
