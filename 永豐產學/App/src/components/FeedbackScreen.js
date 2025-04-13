import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Header from './Header.js';
import '../styles/Feedback.css';

const FeedbackScreen = () => {
    const navigate = useNavigate();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    // 處理星星評分
    const handleStarClick = (starIndex) => {
        setRating(starIndex);
    };

    // 處理評論輸入
    const handleCommentChange = (e) => {
        setComment(e.target.value);
    };

    // 處理表單提交
    const handleSubmit = () => {
        // 這裡可以添加提交評分和評論的邏輯
        console.log('提交評分:', rating, '評論:', comment);

        // 提交後導航到感謝頁面
        navigate('/thank-you');
    };

    // 處理返回按鈕點擊
    const handleBack = () => {
        navigate(-1); // 返回上一頁
    };

    // 判斷送出按鈕是否應該變藍色
    const isButtonActive = comment.trim().length > 0;

    return (
        <div className="feedback-screen">
            <Header title="使用回饋" showBackButton={true} onBack={handleBack} />

            <div className="feedback-container">
                <div className="rating-section">
                    <div className="rating-row">
                        <h2 className="section-title">滿意度</h2>
                        <div className="stars-container">
                            {[1, 2, 3, 4, 5].map((starIndex) => (
                                <span 
                                    key={starIndex} 
                                    className={`star ${rating >= starIndex ? 'active' : ''}`}
                                    onClick={() => handleStarClick(starIndex)}
                                >
                                    ☆
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="comment-section">
                    <div className="comment-row">
                        <h2 className="section-title">評論</h2>
                        <div className="comment-container">
                            <textarea 
                                className="comment-input"
                                placeholder="請輸入您的評論..."
                                value={comment}
                                onChange={handleCommentChange}
                            />
                        </div>
                    </div>
                </div>

                <button 
                    className={`submit-button ${isButtonActive ? 'active' : ''}`} 
                    onClick={handleSubmit}
                >
                    送出
                </button>
            </div>
        </div>
    );
};

export default FeedbackScreen;