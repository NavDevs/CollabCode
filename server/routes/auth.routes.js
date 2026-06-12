const express = require('express');
const { getMe } = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/me', auth, getMe);

module.exports = router;
