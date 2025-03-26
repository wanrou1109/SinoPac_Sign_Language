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
        toggleUserType
    } = useAppContext();

    // 語音辨識
    const handleSpeechRecognition = () => {
        navigate('/speech-recognition');
    };

    // 手語辨識
    const handleSignLanguageRecognition = () => {
        navigate('/sign-language');
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
            navigate('/sign-language', {state: {messageID}});
        }
    };

    // 完成業務
    const handleFinishService = () => {
        navigate('/feedback');
    };



    return (
        <Header title = {selectedBranch || '永豐銀行'} />
    );
}

export default ConversationScreen;