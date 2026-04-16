# 开发注意事项

## 🚨 重要：Git推送时必须关闭VPN

### ❌ 问题
当开启NekoBox VPN时，无法推送到GitHub：
```
kex_exchange_identification: read: Connection reset by peer
Connection reset by 198.18.0.23 port 22
fatal: Could not read from remote repository
```

### ✅ 解决方案

**推送代码前必须关闭NekoBox VPN！**

#### 正确的推送流程：
1. **关闭NekoBox VPN**
2. **测试连接**：
   ```bash
   ping github.com          # 应显示真实IP (如20.205.243.166)
   ssh -T git@github.com   # 应显示成功认证信息
   ```
3. **推送代码**：
   ```bash
   git add .
   git commit -m "提交信息"
   git push origin main
   ```

#### 如果忘记关闭VPN导致推送失败：
1. 关闭NekoBox VPN
2. 重新推送即可

### 🔧 NekoBox配置GitHub直连（推荐）

在NekoBox中配置GitHub域名直连，这样既能保持VPN，又能正常推送：

**在NekoBox的分流规则中添加：**
```
DOMAIN-SUFFIX,github.com,DIRECT
DOMAIN-SUFFIX,githubusercontent.com,DIRECT
DOMAIN-SUFFIX,githubapp.com,DIRECT
DOMAIN-SUFFIX,ghcr.io,DIRECT
```

**配置路径：**
- NekoBox设置 → 分流规则 → 添加域名规则 → 选择"直连"模式

**这样配置后：**
- ✅ 保持VPN保护隐私
- ✅ GitHub相关服务直连
- ✅ 无需每次推送都关闭VPN

### 📱 设备标识规范

为了区分不同设备的提交，建议使用以下格式：

```bash
termux:android 提交信息描述
termux:pixel 提交信息描述
desktop:win11 提交信息描述
macbook:m1 提交信息描述
```

**示例：**
```bash
git commit -m "termux:android 修复移动端卡密容器样式和间距"
```

### 🛠️ 常见开发问题

#### 1. bcrypt编译失败
**问题：** Termux环境中bcrypt原生模块编译失败

**解决：** 项目已使用`bcryptjs`替代`bcrypt`，无需编译

#### 2. 数据库连接失败
**问题：** `Access denied for user 'root'@'localhost'`

**解决：**
```bash
# 重置MariaDB root密码为'root'
mariadb -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; FLUSH PRIVILEGES;"
```

#### 3. MariaDB服务未启动
**问题：** 数据库连接失败，服务未运行

**解决：**
```bash
# 启动MariaDB
mariadbd --datadir=$PREFIX/var/lib/mysql --bind-address=127.0.0.1 --port=3306 &
```

#### 4. 移动端样式问题
**注意：** 修改移动端样式时，确保修改的是正确的媒体查询：
- PC端样式：默认样式
- 移动端样式：`@media (max-width: 640px)` 内的样式

### 📝 提交信息规范

#### 格式要求
```bash
<设备标识>:<设备型号> <简要描述>

<详细说明（可选）>

- 具体修改点1
- 具体修改点2
```

#### 示例
```bash
git commit -m "termux:android 新增移动端支付宝APP拉起支付功能

- 后端添加支付链接返回（payUrl字段）
- 前端自动检测移动设备，显示「打开支付宝」按钮
- 保留原有扫码支付功能，PC端不受影响
- 支持普通商品和接码服务两种支付场景

提升移动端用户体验，一键拉起支付宝完成支付"
```

### 🔒 安全注意事项

1. **不要提交敏感信息**：
   - 数据库密码
   - API密钥
   - 个人访问令牌

2. **环境变量管理**：
   - 生产环境配置使用环境变量
   - 不要在代码中硬编码敏感配置

3. **依赖安全**：
   - 定期更新依赖包
   - 关注安全公告

### 📚 相关文档

- [TERMUX.md](./TERMUX.md) - Termux环境开发指南
- [README.md](./README.md) - 项目说明文档

---

*最后更新：2026-04-16*
*维护者：PumpkinTTL*
