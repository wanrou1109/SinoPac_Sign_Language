import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
  const navigate = useNavigate();
  const { addMessage, editMessage, setRecognitionStatus } = useAppContext();
  const [result, setResult] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const resultBoxRef = useRef(null);
  const editMessageID = useRef(null); // 可根據實際情況傳入

  // 每 3 秒抓一次後端辨識結果
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5050/getRes');
        const data = await res.json();
        if (data.msg && data.msg !== result) {
          console.log("後端辨識結果：", data.msg);
          setResult(data.msg);
        }
      } catch (err) {
        console.error('取得辨識結果失敗:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [result]);

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
          crossOrigin="anonymous"
          alt="Video Feed"
          width="640"
          height="480"
          style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            transform: 'scaleX(-1)'  // 加入水平反轉
          }}
        />
      </div>

      <div className="streaming-result-box">
        <h3>翻譯結果：</h3>
        <div ref={resultBoxRef} className={`result-text ${result ? 'has-content' : ''}`}>
          {result ? (
            <div className="recognized-summary">
              <div className="prompt">翻譯句子：</div>
              <div className="recognized-text">
                <span style={{ fontSize: '32px', color: '#007bff', fontWeight: 'bold' }}>{result}</span>
              </div>
            </div>
          ) : '等待辨識結果...'}
        </div>
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