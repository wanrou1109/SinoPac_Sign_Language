import React from 'react';
import {useNavigate} from 'react-router-dom';
import '../styles/Header.css';

// 新增 title 作為 prop
const Header = ({ title = '手語 / 語音辨識系統', showBackButton, onBack }) => {
    return (
        <div className='header'>
            <div className='header-content'>
                <div className='header-content-left'>
                    {showBackButton && (
                <button className='back-button' onClick={onBack}>
                    <img src = 'images/back.png' width='40px' alt="返回" />
                </button>
                )}
                </div>   
                <div className='header-title'>{title}</div>
                <div className='header-content-right'></div>
            </div>
        </div>
    );
};

export default Header;