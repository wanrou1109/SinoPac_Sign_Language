import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Header from './Header.js';
import '../styles/SpeechRecognition.css';

const SpeechRecognition = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedBranch } = location.state || {};
  const [isRecording, setIsRecording] = useState(true); // 初始為錄音狀態

  // 手語辨識
  const handleSignLanguageRecognition = () => {
    navigate('/sign-language-recognition', { state: { selectedBranch } });
  };

  // 完成業務
  const handleFinishService = () => {
    navigate('/feedback', { state: { selectedBranch } });
  };

  // 語音辨識
  const handleSpeechRecognition = () => {
    navigate('/speech-recognition', { state: { selectedBranch } });
  };

  // 錄音按鈕點擊處理
  const handleRecordButtonClick = () => {
    setIsRecording(false); // 切換到方形按鈕狀態
  };

  // 方形按鈕點擊處理 - 修正跳轉頁面
  const handleSquareButtonClick = () => {
    // 直接跳轉到有對話內容的頁面
    navigate('/recording-result', { 
        state: { 
            selectedBranch
        } 
    });
  };

  // 按鈕容器樣式 - 固定大小和位置
  const buttonContainerStyle = {
    width: '70px',
    height: '70px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 10px' // 確保與兩側按鈕的間距一致
  };

  return (
    <div className='conversation-screen'>
      <Header title={selectedBranch || '永豐銀行'} showBackButton={true} />
      <div className='conversation-container'>
        {/* 這裡可以放置對話內容 */}
      </div>

      <div className='action-bar'>
        <button 
          className='sign-button' 
          style={{ 
            opacity: 0.5, 
            pointerEvents: 'none',
            backgroundColor: '#254A91',
            color: 'white'
          }}
        >
          手語辨識
        </button>
        
        <div style={buttonContainerStyle}>
          {isRecording ? (
            // 圖1：圓形紅點
            <button 
              className='record-button'
              onClick={handleRecordButtonClick}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#E42311',
                border: '2px solid #333',
                boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                padding: 0
              }}
            />
          ) : (
            // 圖2：紅色方形外有圓形包線
            <div 
              onClick={handleSquareButtonClick}
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                border: '2px solid #555',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <div 
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '5px',
                  backgroundColor: '#E42311'
                }}
              />
            </div>
          )}
        </div>
        
        <button 
          className='speech-button' 
          style={{ 
            opacity: 0.5, 
            pointerEvents: 'none',
            backgroundColor: '#DDDDDD',
            color: 'black'
          }}
        >
          語音辨識
        </button>
      </div>
    </div>
  );
};

export default SpeechRecognition;