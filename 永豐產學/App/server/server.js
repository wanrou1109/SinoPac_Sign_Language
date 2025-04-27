const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

const app = express();
const PORT = 8080;
const pythonPath = process.env.PYTHON_PATH || 'python3';

// 啟用 CORS
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
  //limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 創建 feedback schema
const feedbackSchema = new mongoose.Schema({
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: {type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

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
    console.error(`${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python 進程退出，代碼: ${code}`);
    
    try {
      // 使用標記查找JSON部分
      const startMarker = "JSON_RESULT_START";
      const endMarker = "JSON_RESULT_END";
      
      const startIndex = result.indexOf(startMarker);
      const endIndex = result.indexOf(endMarker);
      
      if (startIndex !== -1 && endIndex !== -1) {
        // 提取標記之間的JSON字符串
        const jsonString = result.substring(startIndex + startMarker.length, endIndex).trim();
        console.log('提取的JSON字符串:', jsonString);
        
        const transcription = JSON.parse(jsonString);
        return res.status(200).json(transcription);
      } else {
        console.error('未找到JSON標記');
        return res.status(500).json({
          success: false,
          message: '未找到有效的輸出結果',
          rawOutput: result
        });
      }
    } catch (e) {
      console.error('處理Python輸出時發生錯誤:', e);
      return res.status(500).json({
        success: false,
        message: '處理Python輸出時發生錯誤',
        error: e.message,
        rawOutput: result
      });
    }
  });
});

// feedback API 端點
app.post('/api/feedback', async(req, res) => {
  try {
    const { rating, comment } = req.body;

    console.log('收到回饋數據:', { rating, comment });

    if (!rating || !comment) {
      return res.status(400).json({
        success: false,
        message: '滿意度和評論為必填欄位'
      });
    }

    // 創建 new 回饋紀錄
    const feedback = new Feedback({
      rating, 
      comment
    });

    // save
    const savedFeedback = await feedback.save();
    console.log('回饋保存成功:', savedFeedback);

    return res.status(201).json({
      success: true,
      message: '回饋提交成功',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        comment: feedback.comment,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    console.error('處理回饋時發生錯誤：', error);
    return res.status(500).json({
      success: false,
      message: '伺服器處理回饋時發生錯誤'
    });
  } 
});

app.get('/api/feedback', async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    console.log(`找到 ${feedbacks.length} 條回饋`);
    res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });
  } catch (error) {
    console.error('獲取回饋時出錯:', error);
    res.status(500).json({
      success: false,
      message: '獲取回饋時出錯'
    });
  }
});

// 先連接到 MongoDB，然後再啟動服務器
mongoose.connect('mongodb://localhost:27017/SignLanguageApp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('成功連接 MongoDB');
  
  // 資料庫連接成功後啟動服務器
  app.listen(PORT, function() {
    console.log(`伺服器運行在 http://localhost:${PORT}`);
    console.log(`API 測試端點: http://localhost:${PORT}/api/test`);
  });
}).catch(err => {
  console.error('MongoDB 連接錯誤:', err);
});