const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const Room = require('../models/Room');
const Document = require('../models/Document');
const Message = require('../models/Message');
const WorkspaceFile = require('../models/WorkspaceFile');

const createRoom = async (req, res) => {
  try {
    const { title, language } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Room title is required.' });
    }

    const roomId = nanoid(8);

    const room = await Room.create({
      roomId,
      title: title.trim(),
      language: language || 'javascript',
      ownerId: req.user._id,
      participants: [req.user._id],
    });

    // Create an empty document for this room
    await Document.create({
      roomId,
      content: '',
      language: language || 'javascript',
    });

    return res.status(201).json({ room });
  } catch (error) {
    console.error('Create room error:', error.message);
    return res.status(500).json({ error: 'Server error creating room.' });
  }
};

const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // Add user to participants if not already in
    const isAlreadyParticipant = room.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    // If room is private, and user is not owner, and user hasn't joined before, verify password
    if (room.isPrivate && room.ownerId.toString() !== req.user._id.toString() && !isAlreadyParticipant) {
      const { password } = req.body;
      if (!password) {
        return res.status(401).json({ error: 'Password required to join this room.', code: 'PASSWORD_REQUIRED' });
      }
      const isMatch = await bcrypt.compare(password, room.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
    }

    if (!isAlreadyParticipant) {
      room.participants.push(req.user._id);
      await room.save();
    }

    // Populate participants
    await room.populate('participants', 'username avatarColor');

    return res.status(200).json({ room });
  } catch (error) {
    console.error('Join room error:', error.message);
    return res.status(500).json({ error: 'Server error joining room.' });
  }
};

const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId, isActive: true }).populate(
      'participants',
      'username avatarColor'
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error('Get room error:', error.message);
    return res.status(500).json({ error: 'Server error fetching room.' });
  }
};

const getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      participants: req.user._id,
      isActive: true,
    })
      .populate('ownerId', 'username avatarColor')
      .sort({ createdAt: -1 });

    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('Get user rooms error:', error.message);
    return res.status(500).json({ error: 'Server error fetching rooms.' });
  }
};

const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({ roomId, isActive: true });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    // Remove user from participants
    room.participants = room.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );

    // If no participants left, mark room as inactive
    if (room.participants.length === 0) {
      room.isActive = false;
    }

    await room.save();

    return res.status(200).json({ message: 'Left room successfully.' });
  } catch (error) {
    console.error('Leave room error:', error.message);
    return res.status(500).json({ error: 'Server error leaving room.' });
  }
};

const updateRoomSettings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { isPrivate, password, isReadOnly } = req.body;

    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the room owner can change settings.' });
    }

    if (isPrivate !== undefined) room.isPrivate = isPrivate;
    if (isReadOnly !== undefined) room.isReadOnly = isReadOnly;
    
    if (isPrivate && password) {
      const salt = await bcrypt.genSalt(10);
      room.password = await bcrypt.hash(password, salt);
    } else if (isPrivate === false) {
      room.password = null;
    }

    await room.save();
    return res.status(200).json({ message: 'Settings updated successfully.', room });
  } catch (error) {
    console.error('Update room settings error:', error.message);
    return res.status(500).json({ error: 'Server error updating room settings.' });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(200);
    return res.status(200).json({ messages });
  } catch (error) {
    console.error('Get room messages error:', error.message);
    return res.status(500).json({ error: 'Server error fetching messages.' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    if (room.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the room owner can delete this room.' });
    }

    // Cascade delete everything related to the room
    await WorkspaceFile.deleteMany({ roomId });
    await Document.deleteMany({ roomId });
    await Message.deleteMany({ roomId });
    await Room.deleteOne({ roomId });

    return res.status(200).json({ message: 'Room deleted successfully.' });
  } catch (error) {
    console.error('Delete room error:', error.message);
    return res.status(500).json({ error: 'Server error deleting room.' });
  }
};

module.exports = { createRoom, joinRoom, getRoom, getUserRooms, leaveRoom, updateRoomSettings, getRoomMessages, deleteRoom };
