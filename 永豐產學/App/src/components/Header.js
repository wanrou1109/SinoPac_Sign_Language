import React from 'react';
import {useNavigate} from 'react-router-dom';
import '../styles/Header.css';

// 新增 title 作為 prop
const Header = ({ title = '手語 / 語音辨識系統' }, showBackButton, onBack) => {
    return (
        <div className='header'>
            {showBackButton && (
                <button className='back-button' onClick={onBack}>
                    <img src = 'images/left.png' width='25px' alt="返回" />
                </button>
            )}
            {title}
        </div>
    );
};

export default Header;