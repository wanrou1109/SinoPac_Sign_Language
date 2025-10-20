import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import '../styles/AuthScreen.css';
import Header from './Header.js';
import ConversationScreen from './ConversationScreen.js';

const AuthScreen = () => {
    const navigate = useNavigate();

    const handleStart = () => {
        // lead to 對話頁面
        navigate('/conversation');
    };

    return (
        <div className='auth-container'>
            <div className='title'>
                SignBank<br />
                AI 手語雙向翻譯系統
            </div>

            <button 
                className='start-button'
                onClick={handleStart}>
                開始使用
            </button>
        </div>   
    );
}

export default AuthScreen;