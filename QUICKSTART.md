# 快速启动指南

拉取代码后，按以下步骤操作即可启动项目。

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

```bash
cp .env.example .env
```

然后编辑 `.env`，填入真实配置。**以下为必填项，未配置将导致启动失败或功能异常：**

| 环境变量 | 必填 | 说明 | 未配置的后果 |
|---|---|---|---|
| `JWT_SECRET` | ✅ | 前台用户 JWT 密钥 | 启动报错：`JWT_SECRET 环境变量未配置` |
| `ADMIN_JWT_SECRET` | ✅ | 管理后台 JWT 密钥 | 启动报错：`ADMIN_JWT_SECRET 环境变量未配置` |
| `DB_HOST` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | ✅ | MySQL 数据库连接 | 默认连 `localhost:3306`，root/root，online_shop |
| `MAAPI_TOKEN` | ⚠️ | 接码平台 Token（ejiema.com） | 不影响启动，但接码功能报错：`MAAPI Token 未配置` |
| `ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY` | ⚠️ | 支付宝当面付配置 | 不影响启动，但支付功能报错：`支付宝配置不完整` |

## 3. 启动服务

```bash
npm start
```

默认端口 `5100`，访问 http://localhost:5100

## 常见启动报错

### `Error: Cannot find module 'xxx'`

依赖未安装或 package.json 不完整，执行 `npm install` 即可。

### `JWT_SECRET 环境变量未配置`

`.env` 文件不存在或未配置必填项，参照 `.env.example` 创建。

### `ER_ACCESS_DENIED_ERROR` / 数据库连接失败

检查 `.env` 中的数据库配置是否与本地 MySQL 一致，确保数据库已创建。

### `MAAPI Token 未配置`

接码功能需要 `MAAPI_TOKEN`，在 `.env` 中配置后重启。

### `支付宝配置不完整`

支付功能需要支付宝开放平台的应用配置，在 `.env` 中填入后重启。

## 注意事项

- **开发环境**下 `NODE_ENV=development`，TypeORM 会自动 `synchronize` 同步表结构，无需手动建表
- **生产环境**下 `NODE_ENV=production`，TypeORM 不会自动同步表结构，需要手动迁移
- `.env` 文件已被 `.gitignore` 排除，**不会被提交到仓库**，敏感信息是安全的
- 管理后台地址：http://localhost:5100/admin/element ，默认账号 `admin` / `admin123`
