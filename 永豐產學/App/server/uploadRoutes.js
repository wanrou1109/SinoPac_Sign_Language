const express = require('express');
const router = express.Router();
const uploadController = require('./uploadController');
const upload = require('./uploadMiddleware');

// 直接使用 /api/upload/video 路徑
router.post('/video', upload.single('video'), uploadController.uploadVideo);

// 添加調試路由
router.get('/test-upload', (req, res) => {
  res.json({ message: '上傳路由正常運作中' });
});

module.exports = router;