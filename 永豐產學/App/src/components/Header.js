import React from 'react';
import {useNavigate} from 'react-router-dom';
import '../styles/Header.css';

// 新增 title 作為 prop
const Header = ({ title = '手語 / 語音服務', showBackButton, onBack }) => {
    
    const navigate = useNavigate();

    // 完成業務
    const handleFinishService = () => {
        navigate('/feedback');
    };

    return (
        <div className='header'>
            <div className='header-content'>
                <div className='header-content-left'>
                    {showBackButton && (
                    <button className='back-button' onClick={onBack}>
                        <img src = 'images/previous.png' width='25px' alt="返回" />
                    </button>
                )}
                </div>   
                <div className='header-title'>
                    手語翻譯服務
                </div>
                <div className='header-content-right'>
                    <img src='images/SignBank_no_words.png' width='70px' alt='SignBank '/>
                </div>
            </div>
        </div>
    );
};

export default Header;