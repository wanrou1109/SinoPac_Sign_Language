import React, {useEffect, useState, useMemo} from 'react';
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
    const [isRecordingActive, setIsRecordingActive] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [replacingMessageID, setReplacingMessageID] = useState(null);


    // 使用 useMemo 計算每一方最後一條訊息的索引
    const lastIndices = useMemo(() => {
        // 尋找雙方最後一條訊息
        let lastStaffIndex = -1;
        let lastCustomerIndex = -1;
        
        conversations.forEach((msg, index) => {
            if (msg.sender === 'staff') {
                lastStaffIndex = index;
            } else if (msg.sender === 'customer') {
                lastCustomerIndex = index;
            }
        });
        
        return { lastStaffIndex, lastCustomerIndex };
    }, [conversations]);

    // 判斷訊息是否可編輯
    const isMessageEditable = (message, index) => {
        // 正在編輯 -> 只有當前編輯的訊息可操作
        if (editingMessageID !== null) {
            return message.id === editingMessageID;
        }
        
        // 正在錄音 -> 所有訊息都不可操作
        if (isSpeechRecording) {
            return false;
        }
        
        // 判斷是否是該方的最後一條訊息
        if (message.sender === 'staff') {
            return index === lastIndices.lastStaffIndex;
        } else {
            return index === lastIndices.lastCustomerIndex;
        }
    };

    // 準備錄音狀態設置
    const prepareForRecording = () => {
        setTranscriptText('');
        console.log('準備語音錄音...');
        setIsSpeechRecording(true);
    };

    // 開始或停止錄音
    const toggleRecording = () => {
        if (!isRecordingActive) {
            // 開始錄音
            startRecording();
        } else {
            // 停止錄音並添加結果到對話中
            stopRecordingAndAddToChat();
        }
    };

    // 開始錄音
    const startRecording = async () => {
        setIsRecordingActive(true);
        console.log('開始語音錄音...');

        try {
            // request 麥克風
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const recorder = new MediaRecorder(stream);
            const audioChunks = [];

            // 收集音訊數據
            recorder.ondataavailable = e => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                    console.log('收集音頻數據:', e.data.size, 'bytes');
                }
            };

            // 設置錄音完成處理
            recorder.onstop = async () => {
                console.log('錄音停止，收集了', audioChunks.length, '個音頻塊');
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                console.log('創建音頻 Blob:', audioBlob.size, 'bytes');
                // 加載中
                setTranscriptText('處理中...');
                // 送到後端
                await processAudioWithWhisper(audioBlob);
                // 停止所有音訊軌道
                stream.getTracks().forEach(track => track.stop());
            };

            // 開始錄音
            recorder.start(1000);

            // 保存 recorder 參考，以便稍後停止
            setMediaRecorder(recorder);
        } catch (error) {
            console.error('開始錄音時發生錯誤：', error);
            setIsRecordingActive(false);
            alert('無法啟動麥克風，請確認是否授予麥克風權限。');
        }
    }; 

    const processAudioWithWhisper = async (audioBlob) => {
        try {
            console.log('正在發送 API 請求到:', 'http://localhost:8080/api/speech-recognition');
            console.log('音頻大小:', audioBlob.size, 'bytes');
    
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            console.log('FormData 建立: ', formData.has('audio'));
            
            // 使用 fetch 發送請求
            const response = await fetch('http://localhost:8080/api/speech-recognition', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`伺服器回應錯誤: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                setTranscriptText(result.signLanguage);
            
                if (replacingMessageID) {
                    // 編輯訊息
                    editMessage(replacingMessageID, result.signLanguage);
                    setReplacingMessageID(null);
                } else {
                    // 添加新訊息到對話中
                    const newMessage = {
                        id: Date.now().toString(),
                        text: result.signLanguage,
                        sender: 'staff',
                        timestamp: new Date().toISOString()
                    };
                    
                    setConversations(prev => [...prev, newMessage]);
                }

                setIsSpeechRecording(false);

            } else {
                console.error('語音辨識失敗:', result.error);
                setTranscriptText('語音辨識失敗，請重試。');
            }
        } catch (error) {
            console.error('處理音頻時發生錯誤:', error);
            setTranscriptText('處理音頻時發生錯誤，請重試。');
        }
    };

    // 停止錄音並添加結果到對話中
    const stopRecordingAndAddToChat = () => {
        // 停止 MediaRecorder
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        //  實際訊息添加在 processAudioWithWhisper 成功處理後進行，因此只需設定狀態
        setIsRecordingActive(false);
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
            // 語音辨識：直接進入錄音模式並設置要替換的訊息ID
            prepareForRecording();
            setReplacingMessageID(messageID); 
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
            <Header title = {selectedBranch || '手語／語音辨識系統'} showBackButton = {true} />
            <div className='conversation-container'>
                <div className='message-list'>
                    {conversations.map((message, index) => {
                        const isEditing = editingMessageID === message.id;
                        const canEdit = isMessageEditable(message, index);

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

                                    {canEdit && (
                                        <div className = 'message-actions'>
                                            <button
                                                className = 'image-button edit-button'
                                                onClick = {() => handleEditMessage(message.id)}
                                            >
                                                <img src = 'images/edit.png' width='25px' alt="編輯" />
                                            </button>
                                            <button
                                                className = 'image-button refresh-button'
                                                onClick={() => handleRecordMessage(message.id, message.sender)}
                                            >
                                                <img src = 'images/refresh.png' width = '25px' alt="重新錄製" />
                                            </button>
                                        </div>
                                    )}
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
                            {isRecordingActive ? (
                                <>
                                    <div className='recording-dot'></div>
                                    正在錄音中...
                                </>
                            ) : (
                                transcriptText ? transcriptText : '準備錄音...'
                            )}
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
                    <button 
                        className={`custom-record-button ${isRecordingActive ? 'recording-active' : ''}`}
                        onClick={toggleRecording}
                    >
                        <div className='button-inner'></div>
                    </button>
                ) : (
                    <button className='finish-button' onClick={handleFinishService}>
                        完成業務
                    </button>
                )}

                <button 
                    className={`speech-button ${isSpeechRecording ? 'disabled-button' : ''}`} 
                    onClick={!isSpeechRecording ? prepareForRecording : undefined}
                    disabled={isSpeechRecording}
                >
                    語音辨識
                </button>
            </div>
        </div>
    );
};

export default ConversationScreen;