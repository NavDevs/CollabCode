const express = require('express');
const router = express.Router();
const {
  createRoom,
  joinRoom,
  getRoom,
  getUserRooms,
  leaveRoom,
  updateRoomSettings,
  getRoomMessages,
  deleteRoom,
} = require('../controllers/room.controller');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// POST /api/rooms - Create a new room
router.post('/', createRoom);

// GET /api/rooms - Get all rooms for the current user
router.get('/', getUserRooms);

// GET /api/rooms/:roomId - Get a specific room
router.get('/:roomId', getRoom);

// POST /api/rooms/:roomId/join - Join a room
router.post('/:roomId/join', joinRoom);

// DELETE /api/rooms/:roomId/leave - Leave a room
router.delete('/:roomId/leave', leaveRoom);

// PUT /api/rooms/:roomId/settings - Update room settings
router.put('/:roomId/settings', updateRoomSettings);

// GET /api/rooms/:roomId/messages - Get chat history
router.get('/:roomId/messages', getRoomMessages);

// DELETE /api/rooms/:roomId - Delete a room (owner only)
router.delete('/:roomId', deleteRoom);

module.exports = router;
