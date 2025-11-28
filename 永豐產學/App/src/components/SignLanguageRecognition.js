import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

// === 1. 新增：手語標籤中英對照表 ===
const SIGN_MAPPING = {
  // --- 既有模型標籤 (對應您提供的中文) ---
  'good': '您好',
  'me': '我',             // 視語境也可對應 "個人"
  'i': '我',
  'apply_for': '申請',
  'complete': '完',
  'finish': '完',
  'no': '沒',             // 搭配 problem -> 沒問題
  'problem': '問題',
  'sign': '簽名',
  'id_card': '身分證',
  'paper': '紙',
  'cover_name': '蓋章',
  'check': '檢查',
  'give_you': '給我',
  'take': '拿走',
  'saving_book': '存摺',
  'passbook': '存摺',
  'what': '什麼',
  'use': '用',
  'this': '這',
  'want': '想要',         // 或 "請"
  'invest': '投資',
  'life': '生活',
  'save_money': '存錢',
  'various': '各種',
  'money': '錢',
  'taiwan': '台灣',
  'yes': '是',
  'ten_thousand': '萬',
  
  // --- 數字 ---
  '0': '0', 
  '1': '第ㄧ',
  '2': '第二',
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',

  /* === 待擴充區 ===
     以下是您的中文清單中有，但目前 Python 模型尚未定義英文標籤的詞。
     若未來更新模型，請解開註解並填入對應的英文 Key。
  */
  // 'welcome': '歡迎',
  // 'bank': '銀行',
  // 'may_i_ask': '請問',
  // 'tell': '告訴',
  // 'data': '資料',
  // 'thank_you': '謝謝',
  // 'mask': '口罩',
  // 'take_off': '拿下',
  // 'now': '現在',
  // 'help': '幫你',
  // 'choice': '二選一',
  // 'wait': '守候',
  // 'again': '再',
  // 'photo': '拍照',
  // 'where': '哪',
  // 'network': '網路',
  // 'phone': '手機',
  // 'slide': '滑',
};

const SignLanguageRecognition = () => {
  const navigate = useNavigate();
  // const location = useLocation();
  const { setConversations, editMessage, setRecognitionStatus } = useAppContext();
  // const [ result, setResult ] = useState('');
  const [ isRecording, setIsRecording ] = useState(false);
  // const resultBoxRef = useRef(null);
  const editMessageID = useLocation().state?.messageID || null;

  // 1) 每秒向後端拉一次「原始手語語序」
  const [rawSentence, setRawSentence] = useState('');

  // 設置初始辨識狀態
  useEffect(() => {
    setIsRecording(true);
  }, []);

  // 修改：加快輪詢頻率以達成「即時」效果
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:5050/handlanRes', { 
            method: 'GET',
            mode: 'cors',
            credentials: 'include'
        });
        const data = await res.json();
        
        // 只有當後端有傳回新的非空字串時才更新
        if (data.msg && data.msg.trim() !== '') {
          setRawSentence(data.msg);
        }
      } catch (err) {
        console.error('拉取手語語序失敗', err);
      }
    }, 500); // 0.5秒更新

    return () => clearInterval(iv);
  }, []);
  
  // === 2. 新增：轉換 helper (顯示中文用) ===
  const getDisplaySentence = (sentence) => {
    if (!sentence) return '';
    return sentence
      .split(' ')
      .map(word => SIGN_MAPPING[word] || word) // 查表轉換
      .join(' ');
  };

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

      navigate('/conversation', { state: { newMessage } });

    } catch (error) {
      console.error('處理結果時發生錯誤:', error);
    }
  };

  // 新增：按下停止，才把手語句送到後端翻譯
  const handleStop = async () => {
    setIsRecording(false);
    setRecognitionStatus('idle');

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
      navigate('/conversation');
    }
  };

  const handleBack = () => {
    setIsRecording(false);
    setRecognitionStatus('idle');
    navigate('/conversation');
  };
  

  return (
    <div className='sign-recognition-screen'>
      <Header showBackButton={true} onBack={handleBack} />
      
      {/* === 3. 修改：即時顯示辨識到的中文手語詞彙 === */}
      <div style={{
          marginTop: '15px',
          fontSize: '1.2rem',
          color: '#333',
          fontWeight: 'bold',
          textAlign: 'center',
          minHeight: '30px',
          fontFamily: '"Microsoft JhengHei", sans-serif'
      }}>
        辨識到的手語是：
        <span style={{ color: '#007bff', marginLeft: '8px' }}>
            {getDisplaySentence(rawSentence)}
        </span>
      </div>
      {/* ======================================= */}
      
      <div className='video-stream-box'>
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