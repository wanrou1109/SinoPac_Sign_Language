import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {addMessage, editMessage, setRecognitionStatus, recognitionStatus} = useAppContext();
    const[isRecording, setIsRecording] = useState(false);
    const[result, setResult] = useState('');
    const videoRef = useRef(null);
    const editMessageID = location.state?.messageID;
    const{selectedBranch} = location.state || {};

    // 模擬鏡頭啟動
    useEffect(() => {
        const setupCamera = async () => {
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    const stream = await navigator.mediaDevices.getUserMedia({video: true});
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
        setIsRecording(true);
        setRecognitionStatus('recording');
        setResult('');
    };

    // 停止錄製
    const handleStopRecording = () => {
        setIsRecording(false);
        setRecognitionStatus('processing');

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
    };

    // 取消 and 返回
    const handleCancel = () => {
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
                        className = {isRecording ? 'recording' : ''} 
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