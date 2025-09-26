const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

const app = express();
const PORT = 8080;
const pythonPath = process.env.PYTHON_PATH || 'python';


const axios = require('axios');

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
  ], {
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8'
    }
  });

  let result = '';
  let error = '';

  pythonProcess.stdout.on('data', (data) => {
    result += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    error += data.toString();
    console.error(`[speech_to_text.py][stderr] ${data}`);
  });

  pythonProcess.on('close', async (code) => {
    console.log(`Python 進程退出，代碼: ${code}`);

    // （可選）刪暫存檔
    try {
      // fs.unlinkSync(req.file.path);
    } catch (_) {}

    if (code !== 0) {
      return res.status(500).json({
        success: false,
        message: 'Python 執行失敗',
        stderr: error
      });
    }

    try {
      const transcription = JSON.parse(result);

      // 檢查 python 回傳
      if (transcription.success === false || !transcription.text) {
        return res.status(400).json({
          success: false,
          message: transcription.error || '語音轉文字失敗'
        });
      }

      // 呼叫 Flask 的翻譯 API
      const resp = await axios.post('http://127.0.0.1:5050/api/translate-sign', { text: transcription.text }, { timeout: 30000 });
      const signLanguageText = (resp.data?.signLanguage || '').trim();

      return res.status(200).json({
        success: true,
        text: transcription.text,
        signLanguage: signLanguageText
      });
    } catch (e) {
      console.error('解析結果或翻譯服務失敗:', e, '\n[result raw]=', result);
      return res.status(500).json({
        success: false,
        message: '解析結果或翻譯服務失敗',
        stderr: error
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



/*
// 舊的 語音辨識 API 端點
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
  ], {
    shell: true,
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8'
    }
  });
  
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
    if (code !== 0) {
      return res.status(500).json({ success: false, message: 'Python 執行失敗' });
    }
    try {
      const transcription = JSON.parse(result);
      console.log("transcription :");
      console.log(transcription);

      // 呼叫 translate_to_sign.py，將 Whisper 辨識出的文字送給 LLM 處理
      const llmScript = path.join(__dirname, 'speech_recognition', 'translate_to_sign.py');
      const llmProcess = spawn(pythonPath, [ llmScript, transcription.text], {
        shell:true,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
      });

      let signLanguageText = '';

      llmProcess.stdout.on('data', (chunk) => {
        console.log(chunk);
        signLanguageText += chunk.toString();
        console.log('【LLM 轉手語輸出】', signLanguageText);
      });
      llmProcess.stderr.on('data', chunk => {
        const msg = chunk.toString();
        // 如果是 jieba 正常加载信息，就忽略
        if (/^Building prefix dict from the default dictionary/.test(msg)
            || msg.includes('Loading model from cache')) {
          return;
        }
        // 其他内容才当做错误打印
        console.error('【LLM 錯誤】', msg);
      });
      llmProcess.on('close', (code) => {
        console.log(`LLM 進程退出，代碼: ${code}`);
        return res.status(200).json({
          success: true,
          text: transcription.text,
          signLanguage: signLanguageText.trim()
        });
      });
      
    } catch (e) {
      console.error('解析 Python 回傳 JSON 失敗:', e, result);
      return res.status(500).json({ success: false, message: '解析結果失敗' });
    }
  });
});

*/