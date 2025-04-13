import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addMessage, editMessage, setRecognitionStatus, recognitionStatus } = useAppContext();
    const [ isRecording, setIsRecording ] = useState(false);
    const [ result, setResult ] = useState('');
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChuncksRef = useRef([]);
    const streamRef = useRef(null);
    const editMessageID = location.state?.messageID;
    const { selectedBranch } = location.state || {};

    // 模擬鏡頭啟動
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
            }
        };
        
        setupCamera();

        // 清理函數（為了釋放鏡頭資源，避免記憶體洩漏和不必要的攝像頭佔用）
        return () => {
            if(videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    // 添加這個新的 useEffect 來測試與後端的連接
    useEffect(() => {
        // 測試與後端的連接
        console.log('開始測試與後端的連接...');
        fetch('http://localhost:5000/api/test')
            .then(response => {
                console.log('收到後端回應:', response.status);
                return response.json();
            })
            .then(data => console.log('後端連接測試成功:', data))
            .catch(error => console.error('後端連接錯誤:', error));
    }, []);

    // 手語辨識
    useEffect(() => {
        if(isRecording) {
            // 這裡要連到 API，目前模擬
            const timer = setTimeout(() => {
                setResult('（模擬）：我要辦理存款。');
            }, 1500);

            return () => clearTimeout(timer);
        }
    }, [isRecording]);

    // 開始錄製
    const handleStartRecording = () => {
        if (!streamRef.current) return;

        recordedChuncksRef.current = [];
        const mediaRecorder = new MediaRecorder(streamRef.current, {
            mimeType: 'video/webm'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChuncksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
        setRecognitionStatus('recording');
        setResult('');
    };

    // 停止錄製
    const handleStopRecording = () => {
        if (!mediaRecorderRef.current) return;

        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecognitionStatus('processing');

        // 處理錄好的影像
        mediaRecorderRef.current.onstop = async () => {
            // 創建 Blob 並上傳到後端
            const blob = new Blob(recordedChuncksRef.current, { type: 'video/webm' });

            try {
                await uploadVideoToServer(blob);

                // 處理模擬延遲
                setTimeout(() => {
                    setRecognitionStatus('idle');

                    // 編輯 or 新增？
                    if (editMessageID) {
                        editMessage(editMessageID, result);
                    } else {
                        addMessage(result, 'customer');
                    }

                    // 回 conversation page
                    navigate('/conversation');
                }, 1500);
            } catch (error) {
                console.error('上傳影像失敗：', error);
                setRecognitionStatus('idle');
                alert('上傳影片失敗，請重試。');
            }
        };
    };

    // 上傳到後端服務器
    const uploadVideoToServer = async (videoBlob) => {
        console.log('準備上傳視訊檔案', videoBlob.size);
        const formData = new FormData();
        formData.append('video', videoBlob, 'sign-language-recording.webm');
        
        try {
            console.log('開始向伺服器發送請求');
            const response = await fetch('http://localhost:5000/api/upload-video', {
                method: 'POST',
                credentials: 'omit', // 嘗試改為 'omit'，避免發送 cookies
                mode: 'cors', // 明確指定 CORS 模式
                body: formData,
                headers: {
                    // 不要手動設置 Content-Type，讓瀏覽器自動處理
                    'Accept': 'application/json'
                }
            });
            
            console.log('收到伺服器回應', response.status);
            const data = await response.json();
            console.log('伺服器回應數據', data);
            
            if (!response.ok) {
                throw new Error(data.message || '上傳失敗');
            }
            
            return data;
        } catch (error) {
            console.error('上傳過程中發生錯誤:', error);
            throw error;
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
            <Header title = {selectedBranch || '永豐銀行'} showBackButton = {handleCancel} />

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