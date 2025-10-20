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
                        src="images/SignBank_no_words.png" 
                        alt="SignBank" 
                        className="bank-logo" 
                    />
                </div>

                <div className="message-container">
                    <p className="system-name">SignBank:</p>
                    <p className='system-name'>AI 金融雙向手語翻譯系統</p>
                    <p> </p>
                    <p className="thank-you-message">感謝您的建議與回饋</p>
                    <p className="welcome-message">歡迎再度使用～</p>
                </div>
            </div>
        </div>
    );
};

export default ThankYouScreen;