const express = require('express');
const cors = require('cors');
const path = require('path');
const routes = require('./routes');

// 如果需要數據庫連接
// const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// 啟用 CORS
app.use(cors());

// 解析 JSON 請求體
app.use(express.json());

// 提供對 uploads 目錄的靜態訪問（如需要）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 使用路由
app.use('/api', routes);

// 如果需要連接數據庫
// connectDB();

// 啟動服務器
app.listen(PORT, () => {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
});