const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 設定檔案儲存
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

// 檔案過濾
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('只接受視訊檔案'), false);
  }
};

// 建立 multer 上傳處理器
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: fileFilter
});

module.exports = upload;