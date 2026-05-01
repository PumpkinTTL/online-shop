const express = require('express');
const announcementService = require('../services/announcementService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const announcements = await announcementService.getActiveAnnouncements();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
