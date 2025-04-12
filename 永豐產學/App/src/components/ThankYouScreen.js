import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ThankYou.css';

const ThankYouScreen = () => {
    const navigate = useNavigate();

    // 5 秒自動跳轉
    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/screensaver');
        }, 5000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="thank-you-page">
            <div className="thank-you-frame">
                <div className="logo-container">
                    <img 
                        src="images/SinoPac.jpeg" 
                        alt="永豐銀行" 
                        className="bank-logo" 
                    />
                </div>

                <div className="message-container">
                    <p className="system-name">永豐手語/語音辨識系統</p>
                    <p className="thank-you-message">感謝您的使用與回饋</p>
                    <p className="welcome-message">歡迎再度光臨～</p>
                </div>
            </div>
        </div>
    );
};

export default ThankYouScreen;