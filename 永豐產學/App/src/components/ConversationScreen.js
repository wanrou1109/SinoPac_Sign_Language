import React, {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import {useAppContext} from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/ConversationScreen.css';

const ConversationScreen = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const{ selectedBranch } = location.state || {};
    const { conversations, editMessage} = useAppContext();
    const [ editingMessageID, setEditingMessageID ] = useState(null);
    const [ editingText, setEditingText ] = useState('');


    // 語音辨識
    const handleSpeechRecognition = () => {
        navigate('/speech-recognition');
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

    // 重新錄製訊息
    const handleRecordMessage = (messageID, sender) => {
        // 行員或聾人
        if(sender === 'staff') {
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
            </div>

            <div className='action-bar'>
                <button className = 'sign-button' onClick = {handleSignLanguageRecognition}>
                    手語辨識
                </button>
                <button className = 'finish-button' onClick = {handleFinishService}>
                    完成業務
                </button>
                <button className = 'speech-button' onClick = {handleSpeechRecognition}>
                    語音辨識
                </button>
            </div>
        </div>
    );
};

export default ConversationScreen;