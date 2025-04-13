import React, {useEffect, useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {useAppContext} from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/ConversationScreen.css';

const ConversationScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedBranch } = location.state || {};
    const { conversations, setConversations, editMessage } = useAppContext();

    const [ editingMessageID, setEditingMessageID ] = useState(null);
    const [ editingText, setEditingText ] = useState('');

    const [ isSpeechRecording, setIsSpeechRecording ] = useState(false);
    const [ transcriptText, setTranscriptText ] = useState('');

    // 開始/停止語音辨識
    const toggleSpeechRecording = () => {
        if (!isSpeechRecording) {
            // 開始錄音
            setTranscriptText('');
            console.log('開始語音錄音...');

            // 語音辨識 API
            setIsSpeechRecording(true);

            // 模擬實時更新文字
            const mockTexts = [
                '你好，請問',
                '你好，請問您今天',
                '你好，請問您今天想辦理',
                '您好，請問您今天想辦理什麼業務呢？'
            ];

            // 清除任何可能存在的先前模擬計時器
            if (window.speechSimInterval) clearInterval(window.speechSimInterval);

            let index = 0;
            window.speechSimInterval = setInterval(() => {
                if (index < mockTexts.length) {
                    setTranscriptText(mockTexts[index]);
                    index++;
                } else {
                    clearInterval(window.speechSimInterval);
                }
            }, 1000);
        } else {
            // 停止錄音
            if (window.speechSimInterval) clearInterval (window.speechSimInterval);

            // 當前辨識結果添加到 conversation
            if (transcriptText.trim()) {
                const newMessage = {
                    id : Date.now(),
                    text : transcriptText,
                    sender : 'staff',
                    timestamp : new Date().toISOString()  
                };

                setConversations(prev => [...prev, newMessage]);
            }

            setIsSpeechRecording(false);
        }
    }; 

    // 手語辨識
    const handleSignLanguageRecognition = () => {
        navigate('/sign-language-recognition');
    };

    // 編輯訊息
    const handleEditMessage = (messageID) => {
        const message = conversations.find(msg => msg.id === messageID);
        setEditingMessageID(messageID);
        setEditingText(message.text);
    };

    // 儲存編輯
    const handleSaveEdit = () => {
        if (editingMessageID && editingText.trim()) {
            // 編輯訊息
            editMessage(editingMessageID, editingText.trim());
            setEditingMessageID(null);
            setEditingText('');
        }
    };

    // 取消編輯  
    const handleCancelEdit = () => {
        setEditingMessageID(null);
        setEditingText('');
    };

    // 重新手語辨識
    const handleRecordMessage = (messageID, sender) => {
        // 行員或聾人
        if(sender === 'staff') {
            // 語音辨識：重新開始錄音，沒有紀錄
            toggleSpeechRecording();
        } else {
            // 手語辨識：轉跳手語頁面
            navigate('/sign-language-recognition', {state: {messageID}});
        }
    };

    // 完成業務
    const handleFinishService = () => {
        navigate('/feedback');
    };

    // 清理效果
    useEffect(() => {
        return () => {
            if (window.speechSimInterval) {
                clearInterval(window.speechSimInterval);
            }
        };
    }, []);

    return (
        <div className='conversation-screen'>
            <Header title = {selectedBranch || '永豐銀行'} showBackButton = {true} />
            <div className='conversation-container'>
                <div className='message-list'>
                    {conversations.map((message) => {
                        const isEditing = editingMessageID === message.id;

                        return (
                        <div
                            key = { message.id }
                            className = {`message ${message.sender === 'staff' ? 'staff-message' : 'customer-message'} ${editingMessageID ? (isEditing ? 'editing-message' : 'dimmed-message') : ''}`}
                        >
                            {isEditing ? (
                                <div className ='message-editing'>
                                    <textarea
                                    value = { editingText }
                                    onChange = {(e) => setEditingText(e.target.value)}
                                    autoFocus
                                    />
                                    <div className ='edit-buttons'>
                                        <button onClick = { handleSaveEdit }>確認</button>
                                        <button onClick = { handleCancelEdit }>取消</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className = 'message-content'>
                                        <p>{ message.text }</p>
                                    </div>
                                    <div className = 'message-actions'>
                                        <button
                                            className = 'image-button edit-button'
                                            onClick = {() => handleEditMessage(message.id)}
                                        >
                                            <img src = 'images/edit.png' width='25px' />
                                        </button>
                                        <button
                                            className = 'image-button refresh-button'
                                            onClick={() => handleRecordMessage(message.id, message.sender)}
                                        >
                                            <img src = 'images/refresh.png' width = '25px' />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                        );
                    })}
                </div>
            

                {/* 語音辨識預覽區域 */}
                {isSpeechRecording && (
                    <div className='speech-preview-area'>
                        <div className='recording-indicator'>
                            <div className='recording-dot'></div>
                            正在錄音中...
                        </div>
                        <div className='transcript-preview'>
                            {transcriptText || '等待語音輸入...'}
                        </div>
                    </div>
                )}
            </div>

            <div className='action-bar'>
                <button 
                className={`sign-button ${isSpeechRecording ? 'disabled-button' : ''}`} 
                    onClick={!isSpeechRecording ? handleSignLanguageRecognition : undefined}
                    disabled={isSpeechRecording}
                >
                    手語辨識
                </button>
                {isSpeechRecording ? (
                    <button className='record-button recording' onClick={toggleSpeechRecording}>
                    完成錄音
                    </button>
                ) : (
                    <button className = 'finish-button' onClick = {handleFinishService}>
                        完成業務
                    </button>
                )}

                <button 
                    className={`speech-button ${isSpeechRecording ? 'recording' : ''} ${isSpeechRecording ? 'disabled-button' : ''}`} 
                    onClick={!isSpeechRecording ? toggleSpeechRecording : undefined}
                    disabled={isSpeechRecording}
                >
                    {isSpeechRecording ? '錄音中...' : '語音辨識'}
                </button>
            </div>
        </div>
    );
};

export default ConversationScreen;