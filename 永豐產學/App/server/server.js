const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 8080; // 使用 8080 端口
const pythonPath = process.env.PYTHON_PATH || 'python3';

// 啟用 CORS，允許所有來源
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

// 添加根路徑處理
app.get('/', (req, res) => {
  res.send('手語辨識伺服器運行中 - API 端點: /api/test 和 /api/upload/video');
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

// 語音辨識 API 端點
app.post('/api/speech-recognition', upload.single('audio'), (req, res) => {
  console.log('收到語音辨識請求');
  
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: '未接收到音頻文件'
    });
  }
  
  console.log('音頻文件信息:', req.file);
  
  // 呼叫 Python 進行語音辨識
  const pythonProcess = spawn(pythonPath, [
    path.join(__dirname, 'speech_recognition', 'speech_to_text.py'), 
    req.file.path
  ]);
  
  let result = '';
  let error = '';
  
  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });
  
  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
    console.error(`Python 錯誤: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python 進程退出，代碼: ${code}`);
      return res.status(500).json({
        success: false,
        message: '語音辨識處理錯誤',
        error: error
      });
    }
    
    try {
      // 解析 JSON 輸出
      const transcription = JSON.parse(result);
      return res.status(200).json({
        success: true,
        text: transcription.text,
        signLanguage: transcription.signLanguage
      });
    } catch (e) {
      console.error('無法解析 Python 輸出:', e);
      return res.status(500).json({
        success: false,
        message: '處理 Python 輸出時發生錯誤',
        error: e.message,
        rawOutput: result
      });
    }
  });
});

// 啟動服務器
app.listen(PORT, function() {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
  console.log(`API 測試端點: http://localhost:${PORT}/api/test`);
});