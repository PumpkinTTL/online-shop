const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const dataSource = require('../config/database');
const Admin = require('../entities/Admin');
const logger = require('../logger');

const router = express.Router();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'admin-secret-key-2026-!@#';

// 管理员认证中间件
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未登录，请先登录' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);

    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: '无权限访问' });
    }

    const adminRepo = dataSource.getRepository(Admin);
    const admin = await adminRepo.findOne({ where: { id: decoded.adminId } });
    if (!admin) {
      return res.status(401).json({ error: '管理员不存在' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ error: '账号已被禁用' });
    }

    req.admin = { id: decoded.adminId, role: admin.role };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ error: '无效的认证信息' });
  }
};

// 日志目录配置
const LOG_DIRS = {
  access: path.join(__dirname, '../logs/access'),
  error: path.join(__dirname, '../logs/error'),
  business: path.join(__dirname, '../logs/business'),
  combined: path.join(__dirname, '../logs/combined'),
};

// 读取日志文件列表
router.get('/files', auth, async (req, res) => {
  try {
    const { type = 'combined' } = req.query;
    const logDir = LOG_DIRS[type] || LOG_DIRS.combined;

    const files = await fs.readdir(logDir);
    const logFiles = files
      .filter(f => f.endsWith('.log'))
      .map(f => {
        const filePath = path.join(logDir, f);
        return {
          filename: f,
          type: type,
          // 从文件名提取日期
          date: f.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null,
        };
      })
      .sort((a, b) => b.date?.localeCompare(a.date) || -1);

    res.json(logFiles);
  } catch (error) {
    logger.error('获取日志文件列表失败', { error: error.message });
    res.status(500).json({ error: '获取日志文件列表失败' });
  }
});

// 读取日志文件内容
router.get('/content', auth, async (req, res) => {
  try {
    const { type = 'combined', filename, limit = 100, level, keyword } = req.query;
    const logDir = LOG_DIRS[type] || LOG_DIRS.combined;
    const filePath = path.join(logDir, filename);

    // 验证文件路径，防止目录遍历攻击
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(logDir))) {
      return res.status(400).json({ error: '无效的文件路径' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    // 解析日志并统一字段，避免前端渲染时出现空时间/空消息
    let logs = lines.map(line => {
      try {
        const parsed = JSON.parse(line);
        return {
          ...parsed,
          timestamp: parsed.timestamp || parsed.time || parsed.createdAt || parsed.date || '',
          level: parsed.level || parsed.severity || 'info',
          message: parsed.message || parsed.msg || parsed.event || parsed.url || line,
        };
      } catch {
        return {
          timestamp: '',
          level: 'info',
          message: line,
        };
      }
    });

    // 按级别筛选
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // 按关键词搜索
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      logs = logs.filter(log =>
        JSON.stringify(log).toLowerCase().includes(keywordLower)
      );
    }

    // 限制返回数量（倒序，最新的在前）
    const limitNum = parseInt(limit) || 100;
    logs = logs.slice(-limitNum).reverse();

    res.json({
      total: lines.length,
      filtered: logs.length,
      logs,
    });
  } catch (error) {
    logger.error('读取日志文件失败', { error: error.message });
    res.status(500).json({ error: '读取日志文件失败' });
  }
});

// 获取日志统计
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = {};

    for (const [type, dir] of Object.entries(LOG_DIRS)) {
      try {
        const files = await fs.readdir(dir);
        const logFiles = files.filter(f => f.endsWith('.log'));

        let totalSize = 0;
        let totalLines = 0;

        for (const file of logFiles) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          totalSize += stat.size;

          // 计算行数（只读取前1000行估算）
          try {
            const content = await fs.readFile(filePath, 'utf8');
            totalLines += content.split('\n').length;
          } catch {}
        }

        stats[type] = {
          fileCount: logFiles.length,
          totalSize: totalSize,
          totalLines: totalLines,
          latestFile: logFiles.sort().pop(),
        };
      } catch (err) {
        stats[type] = { error: '无法读取' };
      }
    }

    res.json(stats);
  } catch (error) {
    logger.error('获取日志统计失败', { error: error.message });
    res.status(500).json({ error: '获取日志统计失败' });
  }
});

// 清理旧日志
router.post('/cleanup', auth, async (req, res) => {
  try {
    const { type = 'combined', days = 30 } = req.body;
    const logDir = LOG_DIRS[type] || LOG_DIRS.combined;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const files = await fs.readdir(logDir);
    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.log')) continue;

      const match = file.match(/(\d{4}-\d{2}-\d{2})/);
      if (!match) continue;

      const fileDate = new Date(match[1]);
      if (fileDate < cutoffDate) {
        const filePath = path.join(logDir, file);
        await fs.unlink(filePath);
        deletedCount++;
        logger.admin.info('清理旧日志', { type, file, days });
      }
    }

    res.json({
      message: `已清理 ${deletedCount} 个日志文件`,
      deletedCount,
    });
  } catch (error) {
    logger.error('清理日志失败', { error: error.message });
    res.status(500).json({ error: '清理日志失败' });
  }
});

module.exports = router;
