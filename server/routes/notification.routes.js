const express = require('express');
const router = express.Router();
const { getNotifications, markAllRead, markRead } = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

router.use(auth);

// GET  /api/notifications           — list notifications
router.get('/', getNotifications);

// PUT  /api/notifications/read-all  — mark all as read
router.put('/read-all', markAllRead);

// PUT  /api/notifications/:id/read  — mark one as read
router.put('/:id/read', markRead);

module.exports = router;
