const WorkspaceFile = require('../models/WorkspaceFile');
const Room = require('../models/Room');
const yjsService = require('../services/yjs.service');

// Default initial file templates for each language
const DEFAULT_FILES = {
  javascript: { path: '/main.js',    name: 'main.js',    content: '// Welcome to CollabCode!\n\nconsole.log("Hello, World! 🚀");\n' },
  typescript: { path: '/main.ts',    name: 'main.ts',    content: '// Welcome to CollabCode!\n\nconst message: string = "Hello, World! 🚀";\nconsole.log(message);\n' },
  python:     { path: '/main.py',    name: 'main.py',    content: '# Welcome to CollabCode!\n\nprint("Hello, World! 🚀")\n' },
  java:       { path: '/Main.java',  name: 'Main.java',  content: '// Welcome to CollabCode!\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n' },
  cpp:        { path: '/main.cpp',   name: 'main.cpp',   content: '// Welcome to CollabCode!\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n' },
  c:          { path: '/main.c',     name: 'main.c',     content: '// Welcome to CollabCode!\n\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n' },
  go:         { path: '/main.go',    name: 'main.go',    content: '// Welcome to CollabCode!\n\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n' },
  rust:       { path: '/main.rs',    name: 'main.rs',    content: '// Welcome to CollabCode!\n\nfn main() {\n    println!("Hello, World!");\n}\n' },
  ruby:       { path: '/main.rb',    name: 'main.rb',    content: '# Welcome to CollabCode!\n\nputs "Hello, World!"\n' },
  php:        { path: '/main.php',   name: 'main.php',   content: '<?php\n// Welcome to CollabCode!\n\necho "Hello, World!\\n";\n' },
  bash:       { path: '/main.sh',    name: 'main.sh',    content: '#!/bin/bash\n# Welcome to CollabCode!\n\necho "Hello, World!"\n' },
  html:       { path: '/index.html', name: 'index.html', content: '<!DOCTYPE html>\n<html>\n<head><title>CollabCode</title></head>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>\n' },
  css:        { path: '/style.css',  name: 'style.css',  content: '/* Welcome to CollabCode! */\n\nbody {\n  font-family: sans-serif;\n  background: #0a0a0f;\n  color: #fff;\n}\n' },
  sql:        { path: '/query.sql',  name: 'query.sql',  content: '-- Welcome to CollabCode!\n\nSELECT "Hello, World!" AS message;\n' },
};

const getDefaultFile = (language) => {
  return DEFAULT_FILES[language] || DEFAULT_FILES.javascript;
};

// GET /api/workspaces/:roomId/files — list all files in a workspace
const getFiles = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    let files = await WorkspaceFile.find({ roomId }, { yjsState: 0, content: 0 }).sort({ path: 1 });
    
    // If empty, initialize the default file based on room language
    if (files.length === 0) {
      const defaultFile = getDefaultFile(room.language);
      const initFile = await WorkspaceFile.create({
        roomId,
        path: defaultFile.path,
        name: defaultFile.name,
        language: room.language || 'javascript',
        content: defaultFile.content,
      });
      files = [initFile];
    }

    return res.json({ files });
  } catch (error) {
    console.error('getFiles error:', error.message);
    return res.status(500).json({ error: 'Server error fetching files.' });
  }
};

// POST /api/workspaces/:roomId/files — create a new file
const createFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    let { path, name, language, content } = req.body;
    
    if (!path || !name) return res.status(400).json({ error: 'Path and name are required.' });

    // Enforce absolute-style path root
    if (!path.startsWith('/')) path = '/' + path;

    const existing = await WorkspaceFile.findOne({ roomId, path });
    if (existing) return res.status(400).json({ error: 'File already exists at this path.' });

    const file = await WorkspaceFile.create({
      roomId,
      path,
      name,
      language: language || 'plaintext',
      content: content || '',
    });

    // We don't return the Yjs state buffer, just metadata
    const fileObj = file.toObject();
    delete fileObj.yjsState;

    return res.status(201).json({ file: fileObj });
  } catch (error) {
    console.error('createFile error:', error.message);
    return res.status(500).json({ error: 'Server error creating file.' });
  }
};

// PUT /api/workspaces/:roomId/files/rename — rename or move a file
const renameFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    let { oldPath, newPath, newName } = req.body;

    if (!oldPath || !newPath || !newName) return res.status(400).json({ error: 'Missing parameters.' });
    if (!oldPath.startsWith('/')) oldPath = '/' + oldPath;
    if (!newPath.startsWith('/')) newPath = '/' + newPath;

    const file = await WorkspaceFile.findOne({ roomId, path: oldPath });
    if (!file) return res.status(404).json({ error: 'File not found.' });

    const existing = await WorkspaceFile.findOne({ roomId, path: newPath });
    if (existing) return res.status(400).json({ error: 'A file already exists at the target path.' });

    // Sync memory state before renaming path keys
    await yjsService.renameDocPath(roomId, oldPath, newPath);

    file.path = newPath;
    file.name = newName;
    await file.save();

    const fileObj = file.toObject();
    delete fileObj.yjsState;

    return res.json({ file: fileObj });
  } catch (error) {
    console.error('renameFile error:', error.message);
    return res.status(500).json({ error: 'Server error renaming file.' });
  }
};

// DELETE /api/workspaces/:roomId/files — delete a file
const deleteFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    let { path } = req.body; // Using body for DELETE to pass path safely

    if (!path) return res.status(400).json({ error: 'Path is required.' });
    if (!path.startsWith('/')) path = '/' + path;

    const file = await WorkspaceFile.findOneAndDelete({ roomId, path });
    if (!file) return res.status(404).json({ error: 'File not found.' });

    // Cleanup Yjs memory
    await yjsService.cleanupFileDoc(roomId, path);

    return res.json({ message: 'File deleted.' });
  } catch (error) {
    console.error('deleteFile error:', error.message);
    return res.status(500).json({ error: 'Server error deleting file.' });
  }
};

// GET /api/workspaces/:roomId/preview/* — serve file as raw content for preview iframe
const previewFile = async (req, res) => {
  try {
    const { roomId } = req.params;
    let path = req.params[0];
    if (!path || path === '') path = 'index.html';
    if (!path.startsWith('/')) path = '/' + path;

    const file = await WorkspaceFile.findOne({ roomId, path });
    if (!file) return res.status(404).send('File not found');

    let content = file.content;
    try {
      const ydoc = await yjsService.getOrCreateDoc(roomId, path);
      content = ydoc.getText('monaco').toString() || file.content;
    } catch (e) {}

    const ext = path.split('.').pop().toLowerCase();
    const mimeTypes = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      svg: 'image/svg+xml',
    };
    
    // Explicitly remove security headers that block iframing
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'text/plain');
    res.send(content);
  } catch (error) {
    console.error('previewFile error:', error.message);
    res.status(500).send('Server error');
  }
};

module.exports = { getFiles, createFile, renameFile, deleteFile, previewFile };
