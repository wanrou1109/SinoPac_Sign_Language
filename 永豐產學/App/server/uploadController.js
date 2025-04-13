const uploadVideo = (req, res) => {
  console.log('進入 uploadVideo 控制器');
  
  try {
    if (!req.file) {
      console.error('沒有接收到文件');
      return res.status(400).json({
        success: false,
        message: '未接收到上傳文件'
      });
    }
    
    console.log('上傳文件信息:', req.file);
    
    // 成功處理回應
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
    console.error('上傳處理錯誤:', error);
    return res.status(500).json({
      success: false,
      message: `上傳處理錯誤: ${error.message}`
    });
  }
};

module.exports = {
  uploadVideo
};