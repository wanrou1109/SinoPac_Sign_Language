import React, {useEffect, useState, useMemo, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import {useAppContext} from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/ConversationScreen.css';

const ConversationScreen = () => {
    const navigate = useNavigate();
    const { conversations, editMessage, addMessage } = useAppContext();

    const [ editingMessageId, setEditingMessageId ] = useState(null);
    const [ editingText, setEditingText ] = useState('');

    const [ isSpeechRecording, setIsSpeechRecording ] = useState(false);
    const [ transcriptText, setTranscriptText ] = useState('');
    const [ isRecordingActive, setIsRecordingActive ] = useState(false);
    const [ mediaRecorder, setMediaRecorder ] = useState(null);

    const [ isPlayingSign, setIsPlayingSign ] = useState(false);
    const [ playInterval, setPlayInterval ] = useState(null);

    // Unity
    const unityCanvasRef = useRef(null);
    const unityInstanceRef = useRef(null);
    const [ isUnityLoaded, setIsUnityLoaded ] = useState(false);
    const [ unityError, setUnityError ] = useState(null);

    const [ signMapping, setSignMapping ] = useState(new Map());
    const [ isMappingLoaded, setIsMappingLoaded ] = useState(false);

    // Unity初始化
    useEffect(() => {
        loadCSVMapping();

        const loadUnity = async () => {
            try {
                if (!unityCanvasRef.current) {
                    console.warn('Canvas元素尚未準備好，延遲載入Unity');
                    setTimeout(loadUnity, 100); 
                    return;
                }

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

    // js 解析 csv
    const parseCSV = (csvText) => {
        const lines = csvText.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    columns.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            columns.push(current.trim());
            const cleanedColumns = columns.map(col => col.replace(/^["']|["']$/g, ''));
            result.push(cleanedColumns);
        }
        
        return result;
    };

    // 載入 csv
    const loadCSVMapping = async () => {
        try {
            console.log('載入手語對照表');
            
            const response = await fetch('/sign_language_mapping.csv');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            const parsedData = parseCSV(csvText);
            
            const mapping = new Map();
            
            for (let i = 1; i < parsedData.length; i++) {
                const row = parsedData[i];
                if (row.length >= 2) {
                    const chineseText = row[0]?.trim();
                    const signWord = row[1]?.trim();
                    
                    if (chineseText && signWord) {
                        mapping.set(chineseText, signWord);
                    }
                }
            }
            
            setSignMapping(mapping);
            setIsMappingLoaded(true);
            console.log('手語對照表載入完成');
            
        } catch (error) {
            console.error('載入 CSV 對照表失敗:', error);
            console.log('手語對照表載入失敗');
        }
    };

    // 轉簡寫
    const convertToShortSign = (text) => {
        if (!isMappingLoaded) return text;
        
        const words = text.split(' ').filter(word => word.trim());
        const result = [];
        
        for (const word of words) {
            if (signMapping.has(word)) {
                const shortWord = signMapping.get(word);
                result.push(shortWord);
                console.log(`"${word}" → "${shortWord}"`);
            } else {
                result.push(word);
                console.log(`"${word}" → "${word}" (無對照)`);
            }
        }
        
        return result.join(' ');
    };

    // 獲取手語語序
    const fetchSignWordsAndPlay = async () => {
        try {
            console.log('正在獲取手語語序...');
            const response = await fetch('http://localhost:5050/signseq/staff', {
                method: 'GET',
                credentials: 'include'
            }); 
            const data = await response.json();
            console.log(data);
            
            if (data.msg && data.msg.trim()) {
                console.log('獲取到手語語序:', data.msg);

                const shortSignSequence = convertToShortSign(data.msg);
                console.log('轉換後的簡寫序列:', shortSignSequence);

                playSignAnimation(shortSignSequence); 
            } else {
                console.log('未返回有效手語語序');
            }
        } catch (error) {
            console.error('獲取手語語序失敗:', error);
        }
    };

    // 播放手語動畫的函數（只播放一次）
    const playSignAnimation = (signSequence) => {
        console.log("播放動畫");
        if (isUnityLoaded && unityInstanceRef.current && signSequence.trim()) {
            try {
                const signWords = signSequence.split(' ').filter(word => word.trim());
                signWords.forEach((word, index) => {
                    setTimeout(() => {
                        console.log("播放動畫中1");
                        console.log(unityInstanceRef.current);
                        if (unityInstanceRef.current) {   // ✅ 不要用 isPlayingSign 阻擋
                            console.log("播放動畫中2");
                            unityInstanceRef.current.SendMessage("Armature", "PlaySign", word);
                            console.log("播放動畫中:", word);
                        }
                    }, index * 1500);
                });

                console.log("播放動畫結束（只播放一次）");
            } catch (error) {
                console.error('播放手語動畫失敗:', error);
            }
        }
    };

    // 監聽conversations變化，當有新的staff訊息時播放手語動畫
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
        if (editingMessageId !== null) {
            return message.id === editingMessageId;
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

    // 錄音處理
    const processAudioWithWhisper = async (audioBlob, replaceMessageId = null) => {
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
            console.log("Debug 1 : Result of Speech Recognition");
            console.log(result);
            
            if (result.success) {
                setTranscriptText(result.text);

                if (replaceMessageId) {
                    console.log('替換 id: ', replaceMessageId);
                    editMessage(replaceMessageId, result.text);
                } else {
                    addMessage(result.text, 'staff');
                }

                if (result.signLanguage && result.signLanguage.trim()) {
                    console.log('發送手語語序到 signseq/staff:', result.signLanguage);
                    try {
                        await fetch('http://localhost:5050/signseq/staff', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            credentials: 'include',
                            body: new URLSearchParams({ result: result.signLanguage })
                        });
                        console.log('手语语序发送成功');
                    } catch (error) {
                        console.error('发送手语语序失败:', error);
                    }
                }

                setIsSpeechRecording(false);
                setIsRecordingActive(false);

            } else {
                console.error('語音辨識失敗:', result.error);
                setTranscriptText('語音辨識失敗，請重試。');
                setIsSpeechRecording(false);
                setIsRecordingActive(false);
            }
        } catch (error) {
            console.error('處理音頻時發生錯誤:', error);
            setTranscriptText('處理音頻時發生錯誤，請重試。');
            setIsSpeechRecording(false);
            setIsRecordingActive(false);
        }
    };

    // 開始錄音
    const startRecording = async (replaceMessageId = null) => {
        console.log('開始錄音： ', replaceMessageId ? '替換' : '新增');
        
        setTranscriptText('');
        setIsSpeechRecording(true);
        setIsRecordingActive(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const audioChunks = [];

            recorder.ondataavailable = e => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                setTranscriptText('處理中...');
                await processAudioWithWhisper(audioBlob, replaceMessageId);
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start(1000);
            setMediaRecorder(recorder);
        } catch (error) {
            console.error('開始錄音時發生錯誤：', error);
            setIsRecordingActive(false);
            setIsSpeechRecording(false);
            alert('無法啟動麥克風，請確認是否授予麥克風權限。');
        }
    };

    // 語音辨識按鈕：新增模式
    const handleSpeechRecognition = () => {
        console.log('語音辨識按鈕：新增');
        startRecording(); 
    };

    // 重新錄製按鈕
    const handleRecordMessage = (messageId, sender) => {
        console.log('重新錄製, messageID:', messageId, 'sender:', sender);
        
        if(sender === 'staff') {
            startRecording(messageId); 
        } else {
            navigate('/sign-language-recognition', {state: {messageId}});
        }
    };

    // 停止錄音並添加結果到對話中
    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        setIsRecordingActive(false);
    };

    // 手語辨識
    const handleSignLanguageRecognition = () => {
        navigate('/sign-language-recognition');
    };

    // 編輯訊息
    const handleEditMessage = (messageId) => {
        const message = conversations.find(msg => msg.id === messageId);
        setEditingMessageId(messageId);
        setEditingText(message.text);
    };

    // 儲存編輯
    const handleSaveEdit = () => {
        if (editingMessageId && editingText.trim()) {
            // 編輯訊息
            editMessage(editingMessageId, editingText.trim());
            // 如果是staff的訊息，播放手語動畫
            const message = conversations.find(msg => msg.id === editingMessageId);
            if (message && message.sender === 'staff') {
                playSignAnimation(editingText.trim());
            }
            setEditingMessageId(null);
            setEditingText('');
        }
    };

    // 取消編輯  
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingText('');
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
                    <h3>Sign Language Animation</h3>
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
                        const isEditing = editingMessageId === message.id;
                        const canEdit = isMessageEditable(message, index);

                        return (
                        <div
                            key = { message.id }
                            className = {`message ${message.sender === 'staff' ? 'staff-message' : 'customer-message'} ${editingMessageId ? (isEditing ? 'editing-message' : 'dimmed-message') : ''}`}
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
                    onClick={!isSpeechRecording ? handleSpeechRecognition : undefined}
                    disabled={isSpeechRecording}
                >
                    語音辨識
                </button>
            </div>
        </div>
    );
};

export default ConversationScreen;