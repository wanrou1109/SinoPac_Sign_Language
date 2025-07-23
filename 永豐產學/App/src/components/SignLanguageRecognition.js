import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setConversations, editMessage, setRecognitionStatus } = useAppContext();
  const [ result, setResult ] = useState('');
  const [ isRecording, setIsRecording ] = useState(false);
  const resultBoxRef = useRef(null);
  const editMessageID = useLocation().state?.messageID || null;

  // 每 2 秒抓一次後端 LLM 轉換結果
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5050/getRes', { mode: 'cors' });
        const data = await res.json();

        if (data.msg && data.msg !== result && data.msg.trim() !== '') {
          // console.log("後端辨識結果：", data.msg);
          console.log('LLM 轉換結果：', data.msg);
          setResult(data.msg);
          handleResult(data.msg);
        }
      } catch (err) {
        console.error('取得辨識結果失敗:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [result]);

  // 處理辨識結果
  const handleResult = (chineseText) => {
    try {
      if (editMessageID) {
        // 編輯現有訊息
        editMessage(editMessageID, chineseText);
      } else {
        // 新增訊息到對話
        const newMessage = {
          id: Date.now().toString(),
          text: chineseText,
          sender: 'customer',
          timestamp: new Date().toISOString(),
          type: 'sign_language'
        };
        
        console.log("新增客戶訊息到對話:", newMessage);
        setConversations(prev => [...prev, newMessage]);
      }
      
      // 短暫延遲後返回對話頁面
      setTimeout(() => {
        navigate('/conversation');
      }, 1000);
      
    } catch (error) {
      console.error('處理結果時發生錯誤:', error);
    }
  };

  const handleBack = () => {
    setIsRecording(false);
    setRecognitionStatus('idle');
    navigate('/conversation');
  };

  return (
    <div className='sign-language-recognition-screen'>
      <Header showBackButton={true} onBack={handleBack} />

      <div className='video-stream-box'>
        <h3>後端辨識串流畫面：</h3>
        <img
          src="http://localhost:5050/video_feed"
          alt="Video Feed"
          width="640"
          height="480"
          style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
          }}
          onError={(e) => {
            e.target.style.display = 'none';
            console.error('無法載入串流影像');
          }}
        />
      </div>

      <div className='action-bar'>
        <button className='record-button recording-active' onClick={handleBack}>
          返回
        </button>
      </div>
    </div>
  );
};

export default SignLanguageRecognition;