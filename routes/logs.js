const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { requireAdminAuth } = require('../middleware/auth');
const { system } = require('../logger');

const auth = requireAdminAuth;
const router = express.Router();

// 日志目录配置（4个模块）
const LOG_DIRS = {
  access:   path.join(__dirname, '../logs/access'),
  business: path.join(__dirname, '../logs/business'),
  action:   path.join(__dirname, '../logs/action'),
  system:   path.join(__dirname, '../logs/system'),
};

// 读取日志文件列表
router.get('/files', auth, async (req, res) => {
  try {
    const { type = 'system' } = req.query;
    const logDir = LOG_DIRS[type] || LOG_DIRS.system;

    const files = await fs.readdir(logDir);
    const logFiles = files
      .filter(f => f.endsWith('.log'))
      .map(f => {
        return {
          filename: f,
          type: type,
          date: f.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || null,
        };
      })
      .sort((a, b) => b.date?.localeCompare(a.date) || -1);

    res.json(logFiles);
  } catch (error) {
    system.error('获取日志文件列表失败', { error: error.message });
    res.status(500).json({ error: '获取日志文件列表失败' });
  }
});

// 读取日志文件内容
router.get('/content', auth, async (req, res) => {
  try {
    const { type = 'system', filename, limit = 100, level, keyword, page = 1, pageSize = 50 } = req.query;
    const logDir = LOG_DIRS[type] || LOG_DIRS.system;
    const filePath = path.join(logDir, filename);

    // 验证文件路径，防止目录遍历攻击
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(logDir))) {
      return res.status(400).json({ error: '无效的文件路径' });
    }

    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());

    let logs = lines.map(line => {
      try {
        const parsed = JSON.parse(line);
        return {
          ...parsed,
          timestamp: parsed.timestamp || '',
          level: parsed.level || 'info',
          message: parsed.message || line,
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

    // 倒序：最新的在前
    const allFiltered = [...logs].reverse();
    const total = allFiltered.length;

    // 分页
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || parseInt(limit) || 50;
    const startIdx = (pageNum - 1) * size;
    const pagedLogs = allFiltered.slice(startIdx, startIdx + size);

    res.json({
      total,
      filtered: pagedLogs.length,
      logs: pagedLogs,
    });
  } catch (error) {
    system.error('读取日志文件失败', { error: error.message });
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
    system.error('获取日志统计失败', { error: error.message });
    res.status(500).json({ error: '获取日志统计失败' });
  }
});

// 清理旧日志
router.post('/cleanup', auth, async (req, res) => {
  try {
    const { type = 'system', days = 30 } = req.body;
    const logDir = LOG_DIRS[type] || LOG_DIRS.system;
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
      }
    }

    system.info('清理旧日志', { type, days, deletedCount });

    res.json({
      message: `已清理 ${deletedCount} 个日志文件`,
      deletedCount,
    });
  } catch (error) {
    system.error('清理日志失败', { error: error.message });
    res.status(500).json({ error: '清理日志失败' });
  }
});

module.exports = router;
