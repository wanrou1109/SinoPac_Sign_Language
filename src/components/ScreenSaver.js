import React from 'react';
import { useNavigate } from 'react-router-dom';

const ScreenSaver = () => {
  const navigate = useNavigate();

  // 當螢幕被點擊時，導航到登入頁面
  const handleScreenClick = () => {
    navigate('/');
  };

  return (
    <div className="screen-saver" onClick={handleScreenClick}>
        <div className="screen-saver-content">
            <div className="bank-logo">
                <img src="/logo.png" alt="永豐銀行" />
            </div>
            <div className="touch-instruction">
                <span className="touch-icon">👆</span>
                <p>點擊螢幕開始服務</p>
            </div>
        </div>
    </div>
  );
};

export default ScreenSaver;