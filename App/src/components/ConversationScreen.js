import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {useAppContext} from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/ConversationScreen.css';

const ConversationScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const{selectedBranch} = location.state || {};

    const {
        conversations,
        userType,
    } = useAppContext();

    // 語音辨識
    const handleSpeechRecognition = () => {
        navigate('/speech-recognition', { state: { selectedBranch } });
    };

    // 手語辨識
    const handleSignLanguageRecognition = () => {
        navigate('/sign-language-recognition');
    };

    // 編輯訊息
    const handleEditMessage = (messageID) => {
        navigate('/text-editor', {state: {messageID}});
    };

    // 重新錄製訊息
    const handleRecordMessage = (messageID) => {
        // 行員或聾人
        if(userType === 'staff') {
            navigate('/speech-recognition', {state: {messageID}});
        } else {
            navigate('/sign-language-recognition', {state: {messageID}});
        }
    };

    // 完成業務
    const handleFinishService = () => {
        navigate('/feedback');
    };

    return (
        <div className='conversation-screen'>
            <Header title = {selectedBranch || '永豐銀行'} showBackButton = {true} />
            <div className='conversation-container'>
                <div className='message-list'>
                    {conversations.map((message) => (
                        <div 
                        key={message.id} 
                        className={`message ${message.sender === 'staff' ? 'staff-message' : 'customer-message'}`}
                        >
                            {/* 訊息 */}
                            <div className='message-content'>
                                <p> {message.text} </p>
                            </div>
                            <div className='message-actions'>
                                {/* 編輯按鈕 */}
                                <button 
                                className='icon-button edit-button'
                                onClick={() => handleEditMessage(message.id)}
                                >
                                    <img src='../icon/edit.png'></img>
                                </button>
                                {/* 重新錄製按鈕 */}
                                <button
                                className='icon-button record-button'
                                onClick={() => handleRecordMessage(message.id)}
                                >
                                    <img src='../icon/refresh.png'></img>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className='action-bar'>
                <button className='sign-button' onClick={handleSignLanguageRecognition}>
                    手語辨識
                </button>
                <button className='finish-button' onClick={handleFinishService}>
                    完成業務
                </button>
                <button className='speech-button' onClick={handleSpeechRecognition}>
                    語音辨識
                </button>
            </div>
        </div>
    );
};

export default ConversationScreen;