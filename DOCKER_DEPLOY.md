# Docker 部署指南

## 环境要求

- Docker 20.10+
- Docker Compose v2+
- 已运行的 MariaDB/MySQL 容器（或独立安装）
- 域名 + SSL 证书

## 目录结构

```
online-shop/
├── Dockerfile              # 多阶段构建（前端+后端）
├── docker-compose.yml      # 容器编排
├── .dockerignore            # 构建排除文件
├── .env                     # 环境变量（不进 Git）
├── .env.example             # 环境变量模板
├── init-db.sql              # 数据库初始化脚本
└── ...
```

## 首次部署

### 1. 上传代码

```bash
# 本地打包（排除 node_modules 等）
tar czf online-shop-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='client/node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='client/dist' \
  --exclude='logs' \
  --exclude='.env' \
  --exclude='payment-center' \
  .

# 上传到服务器
scp online-shop-deploy.tar.gz root@<服务器IP>:/opt/

# 服务器上解压
mkdir -p /opt/online-shop
cd /opt/online-shop
tar xzf /opt/online-shop-deploy.tar.gz
```

### 2. 配置环境变量

```bash
cp .env.example .env
nano .env
```

必须修改的配置：

| 变量 | 说明 |
|------|------|
| `DB_HOST` | 数据库地址（Docker 网络内用容器名，如 `mariadb`） |
| `DB_PASSWORD` | 数据库密码 |
| `DB_DATABASE` | 数据库名（默认 `online_shop`） |
| `JWT_SECRET` | JWT 密钥（建议 `openssl rand -base64 32` 生成） |
| `ADMIN_JWT_SECRET` | 管理员 JWT 密钥 |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile 站点密钥 |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile 密钥 |

前端也需要配置（构建时写入）：

```bash
echo "VITE_TURNSTILE_SITE_KEY=你的站点密钥" > client/.env
```

### 3. 初始化数据库

```bash
# 在已有 MariaDB/MySQL 容器中执行
docker cp init-db.sql <数据库容器名>:/tmp/init-db.sql
docker exec <数据库容器名> mysql -u root -p<密码> -e "source /tmp/init-db.sql"
```

### 4. 连接已有数据库网络

如果数据库在另一个 Docker 容器中，需要让 app 容器加入同一网络。

查看数据库容器的网络：

```bash
docker inspect <数据库容器名> --format '{{json .NetworkSettings.Networks}}'
```

在 `docker-compose.yml` 中配置 `external: true` 的网络名。

### 5. 构建并启动

```bash
docker compose up -d --build
```

首次启动会自动创建默认管理员，查看日志获取密码：

```bash
docker logs online-shop-app | grep "默认管理员"
```

### 6. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    if ($scheme = http) { return 301 https://$host$request_uri; }

    location / {
        proxy_pass http://127.0.0.1:5100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 日常运维

### 查看日志

```bash
docker logs -f online-shop-app          # 实时日志
docker logs --tail 50 online-shop-app   # 最近50行
```

### 更新部署

```bash
# 1. 本地打包上传（同首次部署的打包步骤）
scp online-shop-deploy.tar.gz root@<服务器IP>:/opt/

# 2. 服务器上解压并重建
cd /opt/online-shop
tar xzf /opt/online-shop-deploy.tar.gz
docker compose up -d --build
```

> `.env` 文件不会被覆盖（在 `.gitignore` 和 `.dockerignore` 中）。

### 新增环境变量

项目更新后如果 `.env.example` 有新增变量，手动在服务器的 `.env` 中添加即可：

```bash
nano /opt/online-shop/.env
docker restart online-shop-app
```

### 重启 / 停止

```bash
docker restart online-shop-app    # 重启
docker compose down               # 停止
docker compose up -d              # 启动
```

## 端口说明

| 端口 | 用途 | 配置项 |
|------|------|--------|
| 5100（默认） | 应用服务（Nginx 反代） | `.env` 中的 `PORT` |
| 3306 | MariaDB（已有容器） |

## 注意事项

- 前端环境变量（`VITE_*`）是构建时写入的，修改后需要 `docker compose up -d --build` 重新构建
- 后端环境变量修改后 `docker restart online-shop-app` 即可生效
- 数据库表通过 `init-db.sql` 初始化，生产环境 TypeORM 的 `synchronize` 已关闭
- **前端构建的 `base` 路径**：SPA 静态文件（JS/CSS）通过根路径 `/assets/` 访问，不要将后端静态资源目录挂载到 `/assets`，否则会导致前端文件 404
- **init-db.sql 保留字**：`show` 是 MariaDB/MySQL 保留字，建表时必须用反引号 `` `show` `` 包裹
- **日志目录权限**：如果容器以非 root 用户运行，挂载 `./logs:/app/logs` 时可能遇到写入权限问题。Dockerfile 中已预创建 `logs/access`、`logs/error`、`logs/system` 子目录
