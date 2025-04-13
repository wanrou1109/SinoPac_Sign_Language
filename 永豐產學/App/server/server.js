const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// 簡單的 CORS 配置
app.use(cors());

// 解析 JSON 請求體
app.use(express.json());

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 設置 multer
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, 'sign-language-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 測試路由
app.get('/api/test', function(req, res) {
  console.log('收到測試請求');
  res.json({ message: '伺服器運行中' });
});

// 視訊上傳端點
app.post('/api/upload/video', upload.single('video'), function(req, res) {
  console.log('收到上傳請求');
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '未接收到上傳文件'
    });
  }
  
  return res.status(200).json({
    success: true,
    message: '視訊上傳成功',
    file: {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype || '未知'
    }
  });
});

// 啟動服務器
app.listen(PORT, function() {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
});