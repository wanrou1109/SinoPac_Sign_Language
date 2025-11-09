import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
  const navigate = useNavigate();
  // const location = useLocation();
  const { setConversations, editMessage, setRecognitionStatus } = useAppContext();
  // const [ result, setResult ] = useState('');
  const [ isRecording, setIsRecording ] = useState(false);
  // const resultBoxRef = useRef(null);
  const editMessageID = useLocation().state?.messageID || null;

  // 設置初始辨識狀態
  useEffect(() => {
    setIsRecording(true);
  }, []);

  // 每 2 秒抓一次後端 LLM 轉換結果
  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     try {
  //       const res = await fetch('http://localhost:5050/getRes', { mode: 'cors' });
  //       const data = await res.json();

  //       if (data.msg && data.msg !== result && data.msg.trim() !== '') {
  //         // console.log("後端辨識結果：", data.msg);
  //         console.log('LLM 轉換結果：', data.msg);
  //         setResult(data.msg);
  //         handleResult(data.msg);
  //       }
  //     } catch (err) {
  //       console.error('取得辨識結果失敗:', err);
  //     }
  //   }, 2000);

  //   return () => clearInterval(interval);
  // }, [result]);

  // 1) 每秒向後端拉一次「原始手語語序」
  const [rawSentence, setRawSentence] = useState('');
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5050/handlanRes', { 
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
        });
        const data = await res.json();
        if (data.msg && data.msg.trim() !== '') {
          setRawSentence(data.msg);
        }
      } catch (err) {
        console.error('拉取手語語序失敗', err);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  
  // 處理最後拿到的中文句，推到 Conversation
  const handleResult = (chineseText) => {
    const newMessage = {
      id: Date.now().toString(),
      text: chineseText,
      sender: 'customer',
      timestamp: new Date().toISOString(),
      type: 'sign_language'
    };

    try {
      console.log("新增客戶訊息到對話:", newMessage);

      if (editMessageID) {
        editMessage(editMessageID, chineseText);
      } else {
        setConversations(prev => [...prev, newMessage]);
      }

      // ✅ 帶上 newMessage 跳轉
      navigate('/conversation', { state: { newMessage } });

    } catch (error) {
      console.error('處理結果時發生錯誤:', error);
    }
  };

  // 新增：按下停止，才把手語句送到後端翻譯
  const handleStop = async () => {
    // 1) 停辨識、更新狀態
    setIsRecording(false);
    setRecognitionStatus('idle');

    // 2) 一次拿到翻譯
    try {
      const resp = await fetch('http://localhost:5050/translateSign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({signSentence: rawSentence})
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { msg } = await resp.json();
      handleResult(msg || '');
    } catch (err) {
      console.error('翻譯過程錯誤:', err);
      // 失敗也切回去，不阻塞用戶
      navigate('/conversation');
    }
  };

  // 傳統的「取消／返回」只切畫面，不觸發翻譯
  const handleBack = () => {
    setIsRecording(false);
    setRecognitionStatus('idle');
    navigate('/conversation');
  };
  

  return (
    <div className='sign-recognition-screen'>
      <Header showBackButton={true} onBack={handleBack} />

      <div className='video-stream-box'>
        {/*<h3>後端辨識串流畫面：</h3>*/}
        <img
          src="http://localhost:5050/video_feed"
          alt="Video Feed"
          width="840"
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
        <button 
          className={`custom-record-button ${isRecording ? 'recording-active' : ''}`} 
          onClick={handleStop}
        >
          <div className='button-inner'></div>
        </button>
      </div>
    </div>
  );
};

export default SignLanguageRecognition;