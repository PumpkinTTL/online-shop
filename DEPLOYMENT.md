# 生产环境部署清单

> 🚀 部署前必读：快速定位需要修改的配置项

## 🔴 必须修改的配置（不修改无法上线）

### 1. 环境变量配置 (.env)

```bash
# === 数据库配置 ===
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=online_shop_user        # ⚠️ 创建专用数据库用户
DB_PASSWORD=强随机密码              # ⚠️ 必须！使用强密码
DB_DATABASE=online_shop

# === JWT 密钥 ===
JWT_SECRET=生成新的强随机密钥        # ⚠️ 必须！不要使用示例密钥
ADMIN_JWT_SECRET=生成新的强随机密钥 # ⚠️ 必须！不要使用示例密钥

# === 内部调用密钥（新增）===
ADMIN_INTERNAL_KEY=生成新的强随机密钥 # ⚠️ 必须！用于定时任务等内部接口

# === 支付宝配置 ===
ALIPAY_APP_ID=你的应用ID
ALIPAY_PRIVATE_KEY=你的私钥
ALIPAY_PUBLIC_KEY=支付宝公钥

# === 服务器配置 ===
PORT=3000                          # 或根据实际环境修改
NODE_ENV=production                # ⚠️ 必须！生产环境必须设为 production

# === 支付宝回调URL ===
ALIPAY_NOTIFY_URL=https://你的域名.com/api/payment/notify  # ⚠️ 必须！HTTPS + 公网地址

# === CORS 允许的域名（新增）===
ALLOWED_ORIGINS=https://你的域名.com,https://www.你的域名.com  # 生产环境配置
```

### 2. 生成强密钥

```bash
# 生成 JWT 密钥（64位随机字符串）
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 或使用 openssl
openssl rand -hex 64
```

## 🟡 强烈建议的配置

### 3. HTTPS 配置

**生产环境必须启用 HTTPS：**

```bash
# 使用 Let's Encrypt 免费证书
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名.com
```

**Nginx 配置示例：**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

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

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 4. 数据库安全

```bash
# 创建专用数据库用户（不要使用 root）
mysql -u root -p

CREATE USER 'online_shop_user'@'localhost' IDENTIFIED BY '强随机密码';
GRANT ALL PRIVILEGES ON online_shop.* TO 'online_shop_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. 防火墙配置

```bash
# 仅开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 6. 文件权限

```bash
# .env 文件权限设为 600（仅所有者可读写）
chmod 600 /root/online-shop/.env

# 或更严格（禁止写）
chmod 400 /root/online-shop/.env
```

## 🟢 建议配置

### 7. 进程管理（PM2）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name online-shop --env production

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs online-shop

# 重启应用
pm2 restart online-shop
```

### 8. 数据库备份

```bash
#!/bin/bash
# /root/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mysqldump -u online_shop_user -p'密码' online_shop > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

# 添加到定时任务
crontab -e
# 每天凌晨 2 点备份
0 2 * * * /root/backup.sh
```

## ✅ 部署前检查清单

### 核心检查
- [ ] `.env` 中所有密码/密钥已替换为强随机值
- [ ] `NODE_ENV=production` 已设置
- [ ] `ALIPAY_NOTIFY_URL` 是 HTTPS 公网地址
- [ ] HTTPS 证书已配置
- [ ] 数据库已创建专用用户（不用 root）
- [ ] `.env` 文件权限为 600 或 400
- [ ] `.env` 未提交到 Git（检查 .gitignore）

### 功能测试
- [ ] 用户注册/登录正常
- [ ] 支付下单流程正常
- [ ] 支付宝回调能正常接收
- [ ] 后台管理可正常访问
- [ ] 日志能正常写入

### 安全检查
- [ ] 防火墙已配置（仅开放 80/443/22）
- [ ] SSH 禁用密码登录（仅密钥）
- [ ] root 远程登录已禁用
- [ ] 数据库备份已配置
- [ ] PM2 进程管理已配置

## 🚨 安全注意事项

### 已实现的安全措施
- ✅ JWT 认证（用户/管理员分离）
- ✅ bcrypt 密码哈希（10轮）
- ✅ helmet 安全头
- ✅ CORS 跨域控制
- ✅ 请求体大小限制（1MB）
- ✅ 速率限制
- ✅ 参数篡改防护（金额、关键词）
- ✅ 日志审计系统

### 生产环境额外建议
- 定期更新依赖包：`npm audit fix`
- 启用 fail2ban 防止 SSH 暴力破解
- 配置云服务商的安全组
- 定期检查日志异常
- 设置数据库慢查询监控

## 📋 快速参考

| 配置项 | 开发环境 | 生产环境 |
|--------|----------|----------|
| NODE_ENV | development | **production** |
| HTTPS | 否 | **是** |
| ALLOWED_ORIGINS | * | **指定域名** |
| Cookie Secure | 否 | **是** |
| 数据库用户 | root | **专用用户** |
| 密钥强度 | 示例值 | **强随机值** |

## 🔗 相关文档

- [PRODUCTION.md](./PRODUCTION.md) - 详细部署指南
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 开发环境配置
- [MAAPI.md](./MAAPI.md) - 接码服务配置

---

*最后更新：2026-04-17*
*安全加固版本*
