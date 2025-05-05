import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addMessage, editMessage, setRecognitionStatus, recognitionStatus, setConversations } = useAppContext();
    const [isRecording, setIsRecording] = useState(false);
    const [result, setResult] = useState('');
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const streamRef = useRef(null);
    const editMessageID = location.state?.messageID;
    const { selectedBranch } = location.state || {};

    useEffect(() => {
        const setupCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('鏡頭開啟失敗:', error);
                alert('無法開啟鏡頭，請確認已授予攝影機權限。');
            }
        };

        setupCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        console.log('開始測試與後端的連接...');
        fetch('http://localhost:8080/api/test')
            .then(response => response.json())
            .then(data => console.log('後端連接測試成功:', data))
            .catch(error => console.error('後端連接錯誤:', error));
    }, []);

    const handleStartRecording = () => {
        if (!streamRef.current) {
            alert('鏡頭尚未準備就緒');
            return;
        }

        recordedChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
                console.log(`收到錄製片段: ${event.data.size} bytes`);
            }
        };

        mediaRecorder.onstop = async () => {
            try {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                if (blob.size === 0) throw new Error('視訊檔案為空');

                await uploadVideoToServer(blob);

                setTimeout(() => {
                    setRecognitionStatus('idle');
                    if (editMessageID) {
                        editMessage(editMessageID, result);
                    } else {
                        addMessage(result, 'customer');
                    }
                    navigate('/conversation', { state: { selectedBranch } });
                }, 1500);
            } catch (err) {
                console.error('處理錄製錯誤:', err);
                alert('辨識失敗: ' + err.message);
                setRecognitionStatus('idle');
            }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000);
        setIsRecording(true);
        setRecognitionStatus('recording');
        setResult('');
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setRecognitionStatus('processing');
    };

    const uploadVideoToServer = async (videoBlob) => {
        const formData = new FormData();
        formData.append('video', videoBlob, 'sign-language-recording.webm');

        console.log('開始上傳視訊檔案到 /api/upload/video');

        const response = await fetch('http://localhost:8080/api/upload/video', {
            method: 'POST',
            body: formData,
            mode: 'cors',
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`上傳失敗: ${text}`);
        }

        const data = await response.json();
        console.log('上傳成功:', data);

        await analyzeLatestVideo();
        return data;
    };

    const analyzeLatestVideo = async () => {
        try {
            setTimeout(async () => {
                try {
                    console.log('呼叫 /api/analyze_latest 進行辨識...');
                    const response = await fetch('http://localhost:8080/api/analyze_latest');

                    if (!response.ok) {
                        throw new Error(`網路回應不正常: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log('手語辨識結果：', data);

                    if (data.result && data.result.length > 0) {
                        const recognizedText = data.result.join(' ');
                        setResult(recognizedText);
                        const messageID = location.state?.messageID;
                        
                        if (messageID) {
                            editMessage(messageID, recognizedText);
                        } else {
                            const newMessage = {
                                id: Date.now.toString(),
                                text: recognizedText,
                                sender: 'customer',
                                timestamp: new Date.toString()
                            };
                            setConversations(prev => [...prev, newMessage]);
                        }

                        navigate('/conversation');
                    } else {
                        setResult('無法辨識手語內容');
                    }
                } catch (error) {
                    console.error('辨識結果時發生錯誤：', error);
                    setResult('辨識過程發生錯誤，請重試');
                }
            }, 1500);        
        } catch (error) {
            console.error('辨識 API 呼叫失敗:', error);
            setResult('辨識過程發生錯誤，請重試');
        }
    };


    const handleBack = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setRecognitionStatus('idle');
        navigate('/conversation');
    };

    return (
        <div className='sign-language-recognition-screen'>
            <Header showBackButton={true} onBack={handleBack}/>
            <div className='recognition-container'>
                <div className='video-container'>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`${isRecording ? 'recording' : ''} mirror-video`}
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
