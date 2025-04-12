const uploadVideo = (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '未上傳檔案'
        });
      }
  
      // 成功處理回應
      return res.status(200).json({
        success: true,
        message: '視訊上傳成功',
        file: {
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('上傳處理錯誤:', error);
      return res.status(500).json({
        success: false,
        message: '伺服器處理上傳時發生錯誤'
      });
    }
  };
  
  module.exports = {
    uploadVideo
  };