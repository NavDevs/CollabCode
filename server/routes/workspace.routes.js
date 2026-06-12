const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getFiles, createFile, renameFile, deleteFile, previewFile } = require('../controllers/workspace.controller');

// Public route for iframe preview (no auth header needed)
router.get('/:roomId/preview/*', previewFile);

router.use(auth);

// Workspace routes — mounted at /api/workspaces
router.get('/:roomId/files', getFiles);
router.post('/:roomId/files', createFile);
router.put('/:roomId/files/rename', renameFile);
router.delete('/:roomId/files', deleteFile);

module.exports = router;
