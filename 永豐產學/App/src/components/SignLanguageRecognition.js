import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addMessage, editMessage } = useAppContext();
    const [ isRecording, setIsRecording, videoUploaded, setVideoUploaded ] = useState(false);
    const [ recognitionStatus, setRecognitionStatus ] = useState('idle');
    const [ result, setResult ] = useState('');
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const recordedChuncksRef = useRef([]);
    const editMessageID = location.state?.messageID;

    // 鏡頭啟動
    useEffect(() => {
        const setupCamera = async () => {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({video: true});
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                }
            } catch (error) {
                console.error('鏡頭開啟失敗:', error);
                alert('無法開啟鏡頭，請確認您已授予攝影機存取權限。');
            }
        };
        
        setupCamera();

        // 清理函數
        return () => {
            if(streamRef.current) {
                const tracks = streamRef.current.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    // 測試與後端的連接
    useEffect(() => {
        console.log('開始測試與後端的連接...');
        fetch('http://localhost:8080/api/test')
            .then(response => {
                console.log('收到後端回應:', response.status);
                return response.json();
            })
            .then(data => console.log('後端連接測試成功:', data))
            .catch(error => console.error('後端連接錯誤:', error));
    }, []);

    // 開始錄製
    const handleStartRecording = () => {
        if (!streamRef.current) {
            alert('鏡頭尚未準備就緒，請稍後再試。');
            return;
        }

        recordedChuncksRef.current = [];
        try {
            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChuncksRef.current.push(event.data);
                    console.log(`收到錄製片段: ${event.data.size} 位元組`);
                }
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(1000); // 每秒觸發一次 dataavailable 事件
            console.log('開始錄製視訊');
            setIsRecording(true);
            setRecognitionStatus('recording');
            setResult('');
        } catch (error) {
            console.error('啟動錄製時發生錯誤:', error);
            alert(`無法開始錄製: ${error.message}`);
        }
    };

    // 停止錄製
    const handleStopRecording = () => {
        // 檢查是否有進行中的錄製
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
            console.warn('沒有進行中的錄製');
            return;
        }
    
        console.log('停止錄製');
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecognitionStatus('processing');
    
        // 處理錄製完成事件
        mediaRecorderRef.current.onstop = async () => {
            try {
                // 檢查錄製的資料是否有效
                console.log(`錄製完成，共 ${recordedChuncksRef.current.length} 個片段`);
                if (recordedChuncksRef.current.length === 0) {
                    throw new Error('未收到任何視訊資料');
                }
                
                // 創建視頻 Blob
                const blob = new Blob(recordedChuncksRef.current, { type: 'video/webm' });
                console.log(`視訊檔案大小: ${blob.size} 位元組`);
                
                if (blob.size === 0) {
                    throw new Error('視訊檔案大小為 0');
                }
                
                // 上傳視頻到伺服器
                await uploadVideoToServer(blob);
                
                // 上傳成功後立即發起分析請求
                await analyzeLatestVideo();
                
            } catch (error) {
                console.error('處理錄製視訊失敗：', error);
                setRecognitionStatus('idle');
                alert('處理視訊失敗，請重試: ' + error.message);
            }
        };
    };

    // 上傳影片到伺服器
    const uploadVideoToServer = async (videoBlob) => {
        // 準備上傳數據
        const formData = new FormData();
        formData.append('video', videoBlob, 'sign-language-recording.webm');
    
        console.log('準備上傳視訊檔案');
        console.log('視訊檔案大小:', videoBlob.size, '位元組');
    
        try {
            console.log('開始上傳視訊檔案到 /api/upload/video');
    
            // 發送上傳請求
            const response = await fetch('http://localhost:8080/api/upload/video', {
                method: 'POST',
                body: formData,
                mode: 'cors',
                credentials: 'omit',
            });
    
            console.log('收到伺服器回應', response.status);
    
            // 檢查伺服器回應
            if (!response.ok) {
                const errorText = await response.text();
                console.error('伺服器回應錯誤:', errorText);
                throw new Error(`伺服器回應錯誤: ${response.status} ${errorText}`);
            }
    
            // 解析回應數據
            const data = await response.json();
            console.log('伺服器回應數據', data);
    
            return data;
        } catch (error) {
            console.error('上傳過程中發生錯誤:', error);
            throw error;
        }
    };

    // 分析最新上傳影片
    const analyzeLatestVideo = async () => {
        try {
            // 設置處理中狀態
            setResult('處理中...');
            
            // 使用 setTimeout 給後端一些處理時間
            setTimeout(async () => {
                try {
                    const response = await fetch('http://localhost:8080/api/analyze_latest');
                    
                    if (!response.ok) {
                        throw new Error(`網路回應不正常: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('手語辨識結果:', data);
                    
                    // 處理辨識結果
                    if (data.result && data.result.length > 0) {
                        const recognizedText = data.result.join(' ');
                        setResult(recognizedText);
                        
                        // 更新或添加訊息
                        const messageID = location.state?.messageID;
                        if (messageID) {
                            editMessage(messageID, recognizedText);
                        } else {
                            // 使用 addMessage 函數
                            addMessage(recognizedText, 'customer');
                        }
                        
                        // 完成處理
                        setRecognitionStatus('idle');
                        
                        // 返回對話頁面
                        navigate('/conversation');
                    } else {
                        setResult('無法辨識手語內容');
                        setRecognitionStatus('idle');
                    }
                } catch (error) {
                    console.error('取得手語辨識結果時發生錯誤:', error);
                    setResult('辨識過程發生錯誤，請重試');
                    setRecognitionStatus('idle');
                }
            }, 1500);
        } catch (error) {
            console.error('辨識 API 呼叫失敗:', error);
            setResult('辨識過程發生錯誤');
            setRecognitionStatus('idle');
        }
    };

    // 取消 and 返回
    const handleCancel = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setRecognitionStatus('idle');
        navigate('/conversation');
    };

    return (
        <div className='sign-language-recognition-screen'>
            <Header showBackButton = {handleCancel} />

            <div className='recognition-container'>
                <div className='video-container'>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className = {`${isRecording ? 'recording' : ''} mirror-video`} 
                    /> 
                </div>
            </div>

            <div className='action-bar'>
                {!isRecording ? (
                    <button 
                        className='record-button'
                        onClick={handleStartRecording}
                        disabled={recognitionStatus === 'processing'}
                    >
                        <div className='button-inner'></div>
                    </button>
                ) : (
                    <button
                        className='record-button recording-active'
                        onClick={handleStopRecording}
                    >
                        <div className='button-inner'></div>
                    </button>
                )}
            </div>
        </div>
    );
};

export default SignLanguageRecognition;