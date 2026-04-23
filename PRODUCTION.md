# 生产环境部署指南

## 🔒 安全配置清单

### 1. 环境变量配置

**首次部署前必须配置 `.env` 文件：**

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=生成的强密码
DB_DATABASE=online_shop

# JWT 密钥（已生成强密钥）
JWT_SECRET=aHQbxo1FU0mfURV44jHHl16EY0frOMsCXLqmU7trK63w6CGumPcVgwnZViXxadTr
ADMIN_JWT_SECRET=rJL3w3r5ZI84tgtBRsJ2cd45b+WWdgQelpfu0sb/BkmHQNGM9tvyX3lX1P6tfpnS

# 支付宝配置
ALIPAY_APP_ID=2021003139651097
ALIPAY_PRIVATE_KEY=你的支付宝私钥
ALIPAY_PUBLIC_KEY=支付宝公钥

# 服务器配置
PORT=3000
NODE_ENV=production  # 重要：生产环境设为production

# 支付宝回调URL（生产环境必须配置公网地址）
ALIPAY_NOTIFY_URL=https://你的域名.com/api/payment/notify
```

### 2. 数据库密码修改

**⚠️ 生产环境必须修改数据库密码：**

```bash
# 登录MySQL/MariaDB
mariadb -u root -p

# 修改密码（将生成的密码替换进去）
ALTER USER 'root'@'localhost' IDENTIFIED BY 'nb0afMbOodb5sQt+nzkhAG0a/3EnjXMF';
FLUSH PRIVILEGES;

# 更新 .env 文件中的 DB_PASSWORD
```

### 3. HTTPS 配置

**生产环境必须启用HTTPS：**

- 使用 Let's Encrypt 免费证书
- 或使用云服务商提供的SSL证书
- 配置 Nginx/Apache 反向代理

**Nginx 配置示例：**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. TypeORM 同步配置

**✅ 已修复：** 生产环境自动关闭数据库自动同步

- 开发环境 (`NODE_ENV=development`)：`synchronize: true`
- 生产环境 (`NODE_ENV=production`)：`synchronize: false`

### 5. Cookie 安全配置

**✅ 已修复：** 生产环境自动启用 Secure Cookie

- 开发环境：`secure: false`
- 生产环境：`secure: true`（需要HTTPS）

### 6. 敏感文件保护

**✅ 已配置 `.gitignore`：**

```
.env              # 环境变量文件
.env.local
.env.production
*.db              # 数据库文件
*.sqlite
```

**⚠️ 检查清单：**
- [ ] `.env` 文件未被提交到Git
- [ ] 代码中无硬编码密钥
- [ ] 支付宝私钥仅在服务器上存储

### 7. 安全加固建议

#### 高优先级
- [ ] 启用 HTTPS（Let's Encrypt）
- [ ] 修改默认数据库密码
- [ ] 配置防火墙（仅开放 80、443、22 端口）
- [ ] 禁用 root 远程登录
- [ ] 定期备份数据库

#### 中优先级
- [ ] 配置速率限制（Rate Limiting）
- [ ] 添加 CSRF 保护
- [ ] 启用请求日志记录
- [ ] 配置进程管理器（PM2）
- [ ] 设置监控告警

#### 低优先级
- [ ] 启用 Content Security Policy (CSP)
- [ ] 配置 HSTS
- [ ] 添加安全响应头
- [ ] 定期更新依赖包

### 8. 生产环境启动

**使用 PM2 进程管理器：**

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name online-shop

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs online-shop

# 重启应用
pm2 restart online-shop
```

**或直接启动：**
```bash
NODE_ENV=production npm start
```

### 9. 数据库备份

**定期备份脚本：**

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
mysqldump -u root -p online_shop > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

**设置定时任务：**
```bash
crontab -e
# 每天凌晨2点备份
0 2 * * * /path/to/backup.sh
```

### 10. 支付回调URL配置

**生产环境必须配置公网可访问的回调地址：**

```bash
# .env 文件
ALIPAY_NOTIFY_URL=https://你的域名.com/api/payment/notify
```

**注意事项：**
- 域名必须备案（中国大陆）
- 必须使用 HTTPS
- 回调地址需要在支付宝后台配置白名单

## 🔍 部署前检查清单

### 必做项
- [ ] 修改数据库密码
- [ ] 配置 HTTPS 证书
- [ ] 设置 `NODE_ENV=production`
- [ ] 配置正确的 `ALIPAY_NOTIFY_URL`
- [ ] 确保 `.env` 文件权限正确（chmod 600 .env）
- [ ] 测试支付功能正常

### 建议项
- [ ] 安装 PM2 进程管理
- [ ] 配置数据库定期备份
- [ ] 设置防火墙规则
- [ ] 配置日志轮转
- [ ] 添加监控告警

## 📞 常见问题

**Q: 支付回调失败？**
A: 检查 ALIPAY_NOTIFY_URL 是否可公网访问，必须是HTTPS

**Q: Cookie 无效？**
A: 确认已配置 HTTPS，并且 NODE_ENV=production

**Q: 数据库连接失败？**
A: 检查 .env 文件中的数据库配置是否正确

**Q: 支付验签失败？**
A: 确认 ALIPAY_PUBLIC_KEY 配置正确，使用支付宝提供的公钥

---

### 已实现的安全措施
- ✅ JWT 认证（用户/管理员分离密钥）
- ✅ bcrypt 密码哈希（10轮）
- ✅ helmet 安全头（HSTS / X-Frame-Options / X-Content-Type-Options）
- ✅ CORS 跨域控制（生产未配 ALLOWED_ORIGINS 时默认同源）
- ✅ 请求体大小限制（1MB）
- ✅ 速率限制（9 个限流器 + 算术验证码）
- ✅ 参数篡改防护（金额、关键词）
- ✅ 日志审计系统（access/business/action/system 4 模块）
- ✅ 默认管理员密码随机生成（不再硬编码）
- ✅ 管理员初始化接口已移除（启动时自动初始化）
- ✅ 支付取消竞态保护（cancel 前查支付宝真实状态）
- ✅ ADMIN_INTERNAL_KEY 强度校验（必须≥16位）
- ✅ trust proxy 配置（Nginx 反代时获取真实 IP）
- ✅ 封号机制（登录拦截 + requireAuth 检查 + 前端无刷新登出）

*最后更新：2026-04-24*
*维护者：PumpkinTTL*
