import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/ConversationScreen.css';

const RecordingResultScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedBranch } = location.state || {};
    
    const {
        userType,
    } = useAppContext();

    // 語音辨識
    const handleSpeechRecognition = () => {
        navigate('/speech-recognition', { state: { selectedBranch } });
    };

    // 手語辨識
    const handleSignLanguageRecognition = () => {
        navigate('/sign-language-recognition', { state: { selectedBranch } });
    };

    // 完成業務
    const handleFinishService = () => {
        navigate('/feedback', { state: { selectedBranch } });
    };

    // 自定義樣式
    const customMessageListStyle = {
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        overflowY: 'auto',
        flexGrow: 1,
        height: 'calc(100% - 20px)'
    };

    const customMessageStyle = {
        alignSelf: 'flex-end',
        maxWidth: '70%',
        marginBottom: '10px',
        display: 'flex',
        justifyContent: 'flex-end'
    };

    const customMessageContentStyle = {
        backgroundColor: '#F0F0F0', // 對話框顏色
        padding: '12px 18px',
        borderRadius: '18px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        fontSize: '16px',
        lineHeight: '1.4',
        color: '#333'
    };

    return (
        <div className='conversation-screen'>
            <Header title={selectedBranch} showBackButton={true} />
            <div className='conversation-container' style={{ overflowY: 'hidden' }}>
                <div style={customMessageListStyle}>
                    <div style={customMessageStyle}>
                        <div style={customMessageContentStyle}>
                            您好，請問您要辦什麼業務？
                        </div>
                    </div>
                </div>
            </div>

            <div className='action-bar'>
                <button 
                    className='sign-button' 
                    onClick={handleSignLanguageRecognition}
                    style={{
                        backgroundColor: '#254A91',
                        color: 'white'
                    }}
                >
                    手語辨識
                </button>
                <button 
                    className='finish-button' 
                    onClick={handleFinishService}
                    style={{
                        backgroundColor: '#E42311',
                        color: 'white'
                    }}
                >
                    結束業務
                </button>
                <button 
                    className='speech-button' 
                    onClick={handleSpeechRecognition}
                    style={{
                        backgroundColor: '#DDDDDD',
                        color: 'black'
                    }}
                >
                    語音辨識
                </button>
            </div>
        </div>
    );
};

export default RecordingResultScreen;