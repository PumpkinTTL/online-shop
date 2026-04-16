/**
 * 后台 API 安全测试脚本
 * 测试所有敏感接口在无 Token / 无效 Token / 有效 Token 下的访问权限
 * 
 * 用法: node scripts/test-admin-security.js
 */

const BASE_URL = 'http://localhost:5100/api/admin';

// 简易请求函数
async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: e.message } };
  }
}

// 测试结果统计
let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ ${testName}`);
  }
}

async function runTests() {
  console.log('\n🔒 后台 API 安全测试\n');
  console.log('=' .repeat(60));

  // ===== 1. 登录获取有效 Token =====
  console.log('\n📝 步骤1: 登录获取 Token');
  const loginRes = await request('POST', '/login', {
    username: 'admin',
    password: 'admin123',
  });
  const validToken = loginRes.data?.token;
  assert(loginRes.status === 200 && validToken, '管理员登录成功获取 Token');

  if (!validToken) {
    console.log('\n⚠️  无法获取 Token，后续测试跳过');
    console.log(`   登录返回: status=${loginRes.status}, data=`, loginRes.data);
    return;
  }

  // ===== 2. 无 Token 访问所有敏感接口 =====
  console.log('\n📝 步骤2: 无 Token 访问敏感接口（应全部返回 401）');

  const noTokenTests = [
    ['GET', '/stats', '仪表盘统计'],
    ['GET', '/products', '商品列表'],
    ['POST', '/products', '创建商品'],
    ['GET', '/users', '用户列表'],
    ['DELETE', '/users/999', '删除用户'],
    ['GET', '/card-keys', '卡密列表'],
    ['POST', '/card-keys/generate', '生成卡密'],
    ['PUT', '/card-keys/1', '编辑卡密'],
    ['GET', '/orders', '订单列表'],
    ['DELETE', '/orders/999', '删除订单'],
    ['GET', '/admins', '管理员列表'],
    ['POST', '/admins', '创建管理员'],
    ['POST', '/change-password', '修改密码'],
    ['GET', '/check', 'Token 验证'],
  ];

  for (const [method, path, name] of noTokenTests) {
    const body = method === 'POST' || method === 'PUT' ? {} : undefined;
    const res = await request(method, path, body);
    assert(res.status === 401, `${name} (无Token) → ${res.status}`);
  }

  // ===== 3. 无效 Token 访问 =====
  console.log('\n📝 步骤3: 无效 Token 访问（应全部返回 401）');

  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoxLCJ0eXBlIjoiYWRtaW4iLCJpYXQiOjE2MDAwMDAwMDB9.fake';
  
  for (const [method, path, name] of noTokenTests) {
    const body = method === 'POST' || method === 'PUT' ? {} : undefined;
    const res = await request(method, path, body, fakeToken);
    assert(res.status === 401, `${name} (假Token) → ${res.status}`);
  }

  // ===== 4. 前台用户 Token 访问后台（跨权攻击） =====
  console.log('\n📝 步骤4: 前台用户 Token 尝试访问后台（应返回 403）');

  // 先注册/登录一个前台用户
  let userToken = null;
  try {
    // 尝试登录
    const userLogin = await fetch('http://localhost:5100/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser_security', password: 'test123456' }),
    });
    if (userLogin.ok) {
      const ud = await userLogin.json();
      userToken = ud.token;
    }
  } catch (e) {}

  if (userToken) {
    const res = await request('GET', '/stats', undefined, userToken);
    assert(res.status === 401 || res.status === 403, `前台Token访问后台 → ${res.status}`);
  } else {
    console.log('  ⚠️  未获取前台Token，跳过跨权测试');
  }

  // ===== 5. 有效 Token 正常访问 =====
  console.log('\n📝 步骤5: 有效 Token 访问（应全部成功）');

  const validTokenTests = [
    ['GET', '/stats', '仪表盘统计'],
    ['GET', '/products', '商品列表'],
    ['GET', '/users', '用户列表'],
    ['GET', '/card-keys', '卡密列表'],
    ['GET', '/orders', '订单列表'],
    ['GET', '/admins', '管理员列表'],
    ['GET', '/check', 'Token 验证'],
    ['GET', '/card-prefixes', '卡密前缀'],
  ];

  for (const [method, path, name] of validTokenTests) {
    const res = await request(method, path, undefined, validToken);
    assert(res.status === 200, `${name} (有效Token) → ${res.status}`);
  }

  // ===== 6. /init 接口安全性 =====
  console.log('\n📝 步骤6: /init 接口安全性');
  const initRes = await request('POST', '/init', {});
  // 首次运行可能成功（但不应暴露密码），二次运行应返回 400
  assert(
    initRes.status === 400 || (initRes.status === 200 && !initRes.data?.password),
    `/init 不应暴露密码 → status=${initRes.status}`
  );
  if (initRes.data?.password) {
    console.log(`  ⚠️  /init 暴露了默认密码: ${initRes.data.password}`);
  }

  // ===== 7. 登录错误处理 =====
  console.log('\n📝 步骤7: 登录安全');

  const wrongPwd = await request('POST', '/login', { username: 'admin', password: 'wrongpassword' });
  assert(wrongPwd.status === 401, `错误密码登录 → ${wrongPwd.status}`);

  const emptyBody = await request('POST', '/login', {});
  assert(emptyBody.status === 400, `空登录信息 → ${emptyBody.status}`);

  const noExist = await request('POST', '/login', { username: 'nonexistent_admin', password: 'test123' });
  assert(noExist.status === 401, `不存在的用户 → ${noExist.status}`);

  // ===== 汇总 =====
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 测试结果: ✅ ${passed} 通过  ❌ ${failed} 失败\n`);

  if (failed > 0) {
    console.log('⚠️  存在安全风险，请检查上方标记为 ❌ 的项目\n');
    process.exit(1);
  } else {
    console.log('🎉 所有安全测试通过！\n');
    process.exit(0);
  }
}

runTests();
