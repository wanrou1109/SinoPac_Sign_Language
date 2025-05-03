import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Header from './Header.js';
import '../styles/Feedback.css';

const FeedbackScreen = () => {
    const navigate = useNavigate();
    const [ rating, setRating ] = useState(0);
    const [ comment, setComment ] = useState('');
    const [ isSubmitting, setIsSubmitting ] = useState(false);
    const [ errorMessage, setErrorMessage ] = useState('');

    // 處理星星評分
    const handleStarClick = (starIndex) => {
        setRating(starIndex);
    };

    // 處理評論輸入
    const handleCommentChange = (e) => {
        setComment(e.target.value);
    };

    // 處理表單提交
    const handleSubmit = async () => {
        if (!isButtonActive) return;

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const response = await fetch('http://localhost:8080/api/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    rating,
                    comment
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '提交回饋時發生錯誤');
            }

            console.log('提交回饋成功', data);
            navigate('/thank-you');
        } catch (error) {
            console.error('提交回饋時發生錯誤：', error);
            setErrorMessage('提交回饋時發生錯誤，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
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
                                    ★
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

                {errorMessage && (
                    <div className="error-message">{errorMessage}</div>
                )}

                <button 
                    className={`submit-button ${isButtonActive ? 'active' : ''}`} 
                    onClick={handleSubmit}
                    disabled={!isButtonActive || isSubmitting}
                >
                    {isSubmitting ? '提交中...' : '送出'}
                </button>
            </div>
        </div>
    );
};

export default FeedbackScreen;