import React, {useEffect, useState, useMemo, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import {useAppContext} from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/ConversationScreen.css';

const ConversationScreen = () => {
    const navigate = useNavigate();
    const { conversations, setConversations, editMessage } = useAppContext();

    const [ editingMessageID, setEditingMessageID ] = useState(null);
    const [ editingText, setEditingText ] = useState('');

    const [ isSpeechRecording, setIsSpeechRecording ] = useState(false);
    const [ transcriptText, setTranscriptText ] = useState('');
    const [ isRecordingActive, setIsRecordingActive ] = useState(false);
    const [ mediaRecorder, setMediaRecorder ] = useState(null);
    const [ replacingMessageID, setReplacingMessageID ] = useState(null);

    const [ isPlayingSign, setIsPlayingSign ] = useState(false);
    const [ playInterval, setPlayInterval ] = useState(null);


    // Unity
    const unityCanvasRef = useRef(null);
    const unityInstanceRef = useRef(null);
    const [isUnityLoaded, setIsUnityLoaded] = useState(false);
    const [unityError, setUnityError] = useState(null);

    // Unity初始化
    useEffect(() => {
        const loadUnity = async () => {
            try {
                // 等待Canvas元素準備好
                if (!unityCanvasRef.current) {
                    console.warn('Canvas元素尚未準備好，延遲載入Unity');
                    setTimeout(loadUnity, 100); // 100ms後重試
                    return;
                }

                // 動態載入Unity loader
                const script = document.createElement('script');
                script.src = 'SignPlayer/Build/SignPlayer.loader.js';
                script.onload = () => {
                    const config = {
                        dataUrl: "SignPlayer/Build/SignPlayer.data",
                        frameworkUrl: "SignPlayer/Build/SignPlayer.framework.js",
                        codeUrl: "SignPlayer/Build/SignPlayer.wasm",
                        streamingAssetsUrl: "StreamingAssets",
                        companyName: "DefaultCompany",
                        productName: "SignPlayer",
                        productVersion: "1.0",
                        devicePixelRatio: 1
                    };

                    // 確保Canvas存在才初始化Unity
                    if (unityCanvasRef.current) {
                        window.createUnityInstance(unityCanvasRef.current, config).then((unityInstance) => {
                            unityInstanceRef.current = unityInstance;
                            setIsUnityLoaded(true);
                            console.log('Unity手語播放器載入成功');
                        }).catch((message) => {
                            console.error("Unity載入失敗：", message);
                            setUnityError("Unity載入失敗：" + message);
                        });
                    } else {
                        console.error('Canvas元素不存在，無法初始化Unity');
                        setUnityError('Canvas元素不存在，無法初始化Unity');
                    }
                };
                
                script.onerror = () => {
                    setUnityError("無法載入Unity腳本文件");
                };
                
                document.head.appendChild(script);

                // 清理函數：移除script
                return () => {
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                };
            } catch (error) {
                console.error('載入Unity時發生錯誤：', error);
                setUnityError('載入Unity時發生錯誤：' + error.message);
            }
        };

        // 延遲一下再載入，確保DOM已經渲染完成
        const timer = setTimeout(loadUnity, 100);

        // 清理
        return () => {
            clearTimeout(timer);
            if (unityInstanceRef.current) {
                try {
                    unityInstanceRef.current.Quit();
                } catch (e) {
                    console.log('Unity清理錯誤：', e);
                }
            }
        };
    }, []);

    const fetchSignWordsAndPlay = async () => {
        try {
            console.log('正在獲取手語語序...');
            const response = await fetch('http://localhost:5050/getSignWords');
            const data = await response.json();
            
            if (data.msg && data.msg.trim()) {
                console.log('獲取到手語語序:', data.msg);
                playSignAnimation(data.msg);
            } else {
                console.log('沒有獲取到手語語序');
            }
        } catch (error) {
            console.error('獲取手語語序失敗:', error);
        }
    };

    // 播放手語動畫的函數
    const playSignAnimation = (signSequence) => {
        if (isUnityLoaded && unityInstanceRef.current && signSequence.trim()) {
            try {
                const playOneSequence = () => {
                    const signWords = signSequence.split(' ').filter(word => word.trim());
                    signWords.forEach((word, index) => {
                        setTimeout(() => {
                            if (unityInstanceRef.current && isPlayingSign) {
                                unityInstanceRef.current.SendMessage("Mannequin_Female", "PlaySign", word);
                            }
                        }, index * 1500);
                    });
                };
                
                playOneSequence(); // 立即播放第一次
                
                // 計算完整序列時間、設置重複播放（直到有新的 staff 訊息）
                const signWords = signSequence.split(' ').filter(word => word.trim());
                const totalTime = signWords.length * 1500;
                
                const interval = setInterval(() => {
                    if (isPlayingSign) {
                        playOneSequence(); 
                    } else {
                        clearInterval(interval);
                    }
                }, totalTime);
                
                setPlayInterval(interval);
            } catch (error) {
                console.error('播放手語動畫失敗:', error);
            }
        }
    };

    // 監聽conversations變化，當有新的 staff 訊息時播放手語動畫
    useEffect(() => {
        if (conversations.length > 0 && isUnityLoaded) {
            const lastMessage = conversations[conversations.length - 1];
            
            // 加上安全檢查
            if (lastMessage && lastMessage.sender === 'staff' && lastMessage.text) {
                console.log('檢測到新的staff訊息，準備播放手語:', lastMessage.text);
                
                // 停止之前的播放
                if (playInterval) {
                    clearInterval(playInterval);
                    setPlayInterval(null);
                }
                
                setIsPlayingSign(true);
                setTimeout(async () => {
                    await fetchSignWordsAndPlay();
                }, 500);
            }
        }
    }, [conversations, isUnityLoaded]);


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

    // 開始錄音
    const startRecording = async () => {
        setTranscriptText('');
        console.log('直接開始語音錄音...');
        setIsSpeechRecording(true);
        setIsRecordingActive(true);

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
                setTranscriptText('處理中...');
                await processAudioWithWhisper(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            // 開始錄音
            recorder.start(300);
            setMediaRecorder(recorder);
        } catch (error) {
            console.error('開始錄音時發生錯誤：', error);
            setIsRecordingActive(false);
            setIsSpeechRecording(false);
            alert('無法啟動麥克風，請確認是否授予麥克風權限。');
        }
    }; 

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        setIsRecordingActive(false);
    }

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
                setTranscriptText(result.text);
            
                if (replacingMessageID) {
                    // 編輯訊息
                    editMessage(replacingMessageID, result.text);
                    setReplacingMessageID(null);
                } else {
                    // 添加新訊息到對話中
                    // 如果 result.text 改成 result.signLanguage 就會是手語語序
                    const newMessage = {
                        id: Date.now().toString(),
                        text: result.text,
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
    const handleRecordMessage = async (messageID, sender) => {
        // 行員或聾人
        if(sender === 'staff') {
            // 語音辨識：直接開始錄音並設置要替換的訊息ID
            setReplacingMessageID(messageID);
            await startRecording(); // 改為直接開始錄音
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

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className='conversation-screen'>
            <Header showBackButton = {true} onBack={handleBack}/>

            {/* Unity */}
            <div className="unity-sign-animation-container">
                <div className="unity-header">
                    <h3>語音轉手語動畫</h3>
                    {unityError && <div className="unity-error">錯誤: {unityError}</div>}
                    {!isUnityLoaded && !unityError && <div className="unity-loading">載入中...</div>}
                </div>
                <div className="unity-canvas-wrapper">
                    <canvas 
                        ref={unityCanvasRef}
                        id="unity-canvas" 
                        width="480" 
                        height="300"
                        style={{
                            width: '100%',
                            height: '100%',
                            background: '#fff',
                            border: '1px solid #ddd'
                        }}
                    />
                </div>
            </div>

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
                        onClick={stopRecording}
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
                    onClick={!isSpeechRecording ? startRecording : undefined}
                    disabled={isSpeechRecording}
                >
                    語音辨識
                </button>
            </div>
        </div>
    );
};

export default ConversationScreen;