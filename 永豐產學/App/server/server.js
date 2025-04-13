const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// 正確配置 CORS - 這是關鍵部分
app.use(cors({
  origin: 'http://localhost:3000', // 指定你的前端網址
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 解析 JSON 請求體
app.use(express.json());

// 設置上傳目錄
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 設置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExt = path.extname(file.originalname);
    cb(null, `sign-language-${uniqueSuffix}${fileExt}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 測試路由
app.get('/api/test', (req, res) => {
  console.log('收到測試請求');
  res.json({ message: '伺服器運行中' });
});

// 視訊上傳端點
app.post('/api/upload-video', upload.single('video'), (req, res) => {
  console.log('收到上傳請求', req.headers);
  
  try {
    if (!req.file) {
      console.error('沒有接收到文件');
      return res.status(400).json({
        success: false,
        message: '未接收到上傳文件'
      });
    }
    
    console.log('上傳文件信息:', req.file);
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
  } catch (error) {
    console.error('處理上傳時錯誤:', error);
    return res.status(500).json({
      success: false,
      message: `上傳處理錯誤: ${error.message}`
    });
  }
});

// 啟動服務器
app.listen(PORT, () => {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
});