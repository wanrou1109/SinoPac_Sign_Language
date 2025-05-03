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
                <h1>手語 / 語音辨識系統</h1>
            </div>

            <button 
                className='start-button'
                onClick={handleStart}>
                開始使用 Start
            </button>
        </div>   
    );
}

export default AuthScreen;