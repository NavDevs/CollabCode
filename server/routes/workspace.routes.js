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
router.put('/:roomId/files/content', async (req, res) => {
  try {
    const { path, content } = req.body;
    const WorkspaceFile = require('../models/WorkspaceFile');
    const file = await WorkspaceFile.findOne({ roomId: req.params.roomId, path });
    if (!file) return res.status(404).json({ error: 'File not found' });
    file.content = content;
    file.updatedAt = new Date();
    await file.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/:roomId/files', deleteFile);

module.exports = router;
