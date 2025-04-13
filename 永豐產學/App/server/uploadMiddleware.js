const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

console.log('上傳目錄設置在:', uploadDir);

// 設定檔案儲存
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('設置目的地為:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    console.log('處理上傳檔案:', file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const fileExt = path.extname(file.originalname) || '.webm'; // 如果沒有副檔名，預設為 .webm
    cb(null, `sign-language-${uniqueSuffix}${fileExt}`);
  }
});

// 檔案過濾 - 寬鬆設置
const fileFilter = (req, file, cb) => {
  console.log('檔案類型:', file.mimetype);
  // 接受所有視訊類型或二進制檔案
  if (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream') {
    cb(null, true);
  } else {
    console.warn('非視訊檔案類型:', file.mimetype);
    // 仍然接受檔案，但記錄警告
    cb(null, true);
  }
};

// 建立 multer 上傳處理器
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 增加到 100MB
  },
  fileFilter: fileFilter
});

module.exports = upload;