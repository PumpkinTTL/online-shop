#!/bin/bash

echo "🚀 启动在线商城项目..."

# 启动 MariaDB
echo "📦 启动 MariaDB..."
if ! pgrep -x "mariadbd" > /dev/null; then
    mariadbd --user=root --datadir=$PREFIX/var/lib/mysql --bind-address=127.0.0.1 --port=3306 > /tmp/mariadb.log 2>&1 &
    sleep 2
    echo "✅ MariaDB 已启动"
else
    echo "✅ MariaDB 已在运行"
fi

# 等待数据库就绪
echo "⏳ 等待数据库就绪..."
for i in {1..10}; do
    if mariadb -u root -e "SELECT 1" > /dev/null 2>&1; then
        echo "✅ 数据库已就绪"
        break
    fi
    sleep 1
done

# 启动项目
echo "🛒 启动商城项目..."
npm start
