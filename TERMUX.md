# Termux 环境开发指南

## 📱 概述

本文档介绍在 Termux (Android 终端环境) 中开发和运行 `online-shop` 项目的特殊配置和注意事项。

## 🚀 快速启动

### 1. 环境准备

```bash
# 更新包管理器
pkg update && pkg upgrade

# 安装必要工具
pkg install git python cmake make ndk-multilib nodejs npm -y

# 安装 MariaDB (MySQL 兼容)
pkg install mariadb -y
```

### 2. 克隆项目

```bash
git clone https://github.com/PumpkinTTL/online-shop.git
cd online-shop
```

### 3. 安装依赖

```bash
npm install
```

**注意：** 项目已将 `bcrypt` 替换为 `bcryptjs` 以兼容 Termux 环境，无需编译原生模块。

### 4. 数据库配置

```bash
# 初始化 MySQL 数据目录
mysql-install-db

# 启动 MariaDB 服务
mariadbd --datadir=$PREFIX/var/lib/mysql --bind-address=127.0.0.1 --port=3306 &

# 创建数据库
mariadb -u root -e "CREATE DATABASE IF NOT EXISTS online_shop;"

# 设置 root 密码（与项目配置一致）
mariadb -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; FLUSH PRIVILEGES;"
```

### 5. 启动项目

```bash
npm start
```

项目将在 `http://localhost:5100` 启动。

## 🔧 特殊配置说明

### 依赖差异

| 原依赖 | Termux 替代 | 原因 |
|--------|-------------|------|
| `bcrypt` | `bcryptjs` | bcrypt 需要编译原生模块，在 Termux 环境中编译困难 |

**影响：**
- API 完全兼容，无需修改业务代码
- 性能差异可忽略不计
- 跨平台兼容性更好

### 数据库配置

**Termux 环境：**
- 使用 MariaDB 替代 MySQL
- 默认安装路径：`/data/data/com.termux/files/usr/`
- 数据目录：`$PREFIX/var/lib/mysql`

**项目配置 (`config/database.js`)：**
```javascript
{
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'root',
  database: 'online_shop'
}
```

### 自动表结构同步

项目使用 TypeORM 的 `synchronize: true` 特性：
- 自动创建数据库表
- 自动同步实体结构变化
- 无需手动编写 SQL DDL

**⚠️ 注意：** 生产环境应关闭此功能，使用 Migration。

## 🛠️ 开发工作流

### 提交代码规范

为便于区分不同设备的提交，建议使用以下格式：

```bash
termux:pixel 提交信息描述
desktop:win11 提交信息描述
macbook:m1   提交信息描述
```

**当前设备提交示例：**
```bash
git add .
git commit -m "termux:android 将bcrypt改为bcryptjs以提升跨平台兼容性"
git push
```

### 常用命令

```bash
# 启动 MariaDB
mariadbd --datadir=$PREFIX/var/lib/mysql --bind-address=127.0.0.1 --port=3306 &

# 检查 MariaDB 状态
pgrep -a mariadbd

# 连接数据库
mariadb -u root -p

# 启动项目
npm start

# 停止项目
pkill -f "node app.js"

# 查看日志
tail -f logs/app.log  # 如果配置了日志
```

## 📊 与 PC 环境的差异

### 相同部分
- ✅ Node.js 版本要求一致
- ✅ 大部分依赖包通用
- ✅ 项目结构完全相同
- ✅ API 接口完全一致
- ✅ 业务逻辑代码相同

### 差异部分

| 项目 | PC 环境 | Termux 环境 |
|------|---------|-------------|
| 数据库 | MySQL Server | MariaDB |
| bcrypt | 原生模块 | bcryptjs (纯JS) |
| 端口访问 | localhost | 可能需要额外配置网络 |
| 文件路径 | `/home/user/` | `/data/data/com.termux/files/home/` |
| 进程管理 | systemd/PM2 | 手动管理 |

## ⚠️ 常见问题

### 1. bcrypt 编译失败

**问题：** `npm install` 时 bcrypt 报错
```
gyp ERR! find Python
gyp ERR! configure error
```

**解决：** 项目已使用 `bcryptjs` 替代，无需编译。

### 2. 数据库连接失败

**问题：** `Access denied for user 'root'@'localhost'`

**解决：**
```bash
# 重新设置密码
mariadb -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; FLUSH PRIVILEGES;"
```

### 3. 端口被占用

**问题：** `EADDRINUSE: address already in use :::5100`

**解决：**
```bash
# 查找占用进程
netstat -tulpn | grep 5100

# 停止进程
pkill -f "node app.js"
```

### 4. MariaDB 启动失败

**问题：** 数据目录未初始化

**解决：**
```bash
mysql-install-db
mariadbd --datadir=$PREFIX/var/lib/mysql --bind-address=127.0.0.1 --port=3306 &
```

## 🌐 网络配置

### 本地访问
```bash
http://localhost:5100
```

### 局域网访问（如需从其他设备访问）

1. 获取设备 IP：
```bash
ip addr show wlan0
```

2. 修改 `app.js` 中的监听地址：
```javascript
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
```

3. 从其他设备访问：
```bash
http://<设备IP>:5100
```

## 📱 性能优化建议

### Termux 环境优化
1. **关闭不必要的后台服务**
2. **使用 npm ci 代替 npm install**（更快）
3. **考虑使用 PM2 管理进程**（如需要持久化）
4. **定期清理 npm 缓存**

### 开发建议
1. **使用轻量级编辑器**（如 vim、nano）
2. **配置别名简化常用命令**
3. **使用 tmux 或 screen 进行多会话管理**

## 🔄 数据同步

### 从 PC 推送到 Termux
```bash
# 在 Termux 中
git pull origin main
npm install
```

### 从 Termux 推送到 PC
```bash
# 在 Termux 中
git add .
git commit -m "termux:android 提交信息"
git push
```

## 📚 参考资源

- [Termux Wiki](https://wiki.termux.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [MariaDB Documentation](https://mariadb.com/kb/en/documentation/)
- [Node.js Documentation](https://nodejs.org/)

## 🎯 总结

在 Termux 环境中开发此项目的主要特殊处理：

1. ✅ 使用 `bcryptjs` 替代 `bcrypt`
2. ✅ 安装并配置 MariaDB
3. ✅ 手动管理数据库服务进程
4. ✅ 使用设备标识前缀区分提交
5. ✅ 注意文件路径差异

**除此之外，开发体验与 PC 环境基本一致！**

---

*最后更新：2026-04-16*
*维护者：PumpkinTTL*
