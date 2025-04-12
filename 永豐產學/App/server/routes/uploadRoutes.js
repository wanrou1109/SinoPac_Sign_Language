const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const uploadMiddleware = require('../middleware/uploadMiddleware');

router.post('/video', uploadMiddleware.single('video'), uploadController.uploadVideo);

module.exports = router;