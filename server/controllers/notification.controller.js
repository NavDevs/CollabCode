const Notification = require('../models/Notification');

// GET /api/notifications — list user's notifications (newest first, limit 50)
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error.message);
    return res.status(500).json({ error: 'Server error fetching notifications.' });
  }
};

// PUT /api/notifications/read-all — mark all as read
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

// PUT /api/notifications/:id/read — mark one as read
const markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    return res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error.message);
    return res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { getNotifications, markAllRead, markRead };
