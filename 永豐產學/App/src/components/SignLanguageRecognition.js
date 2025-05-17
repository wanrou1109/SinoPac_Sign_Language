import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addMessage, editMessage, setRecognitionStatus, recognitionStatus } = useAppContext();
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

<<<<<<< Updated upstream
=======
    useEffect(() => {
        if (isRecording) {
            recognitionIntervalRef.current = setInterval(async () => {
                try {
                    const res = await fetch('http://localhost:5000/get_result');
                    const data = await res.json();
                    const newText = data.result;

                    if (newText && newText !== lastRecognizedTextRef.current) {
                        lastRecognizedTextRef.current = newText;
                        setResult(prev => (prev ? `${prev} ${newText}` : newText));
                    }
                } catch (err) {
                    console.error('取得辨識結果錯誤:', err);
                }
            }, 2000);
        }

        return () => {
            clearInterval(recognitionIntervalRef.current);
        };
    }, [isRecording]);

    // 即時辨識
    const startPeriodicRecognition = () => {
        recognitionIntervalRef.current = setInterval(() => {
            if (!isProcessing) {
                captureAndRecognize();
            }
        }, 2000);
    };

    const captureAndRecognize = async () => {
        if (!videoRef.current || !streamRef.current) return;

        try {
            setIsProcessing(true);

            // canvas -> 捕捉當前影片幀
            const canvas = document.createElement('canvas');
            const videoElement = videoRef.current;

            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;

            // 影片幀繪製到 canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // canvas 轉成 blob
            const blob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', 0.9);
            });

            if (!blob) {
                throw new Error('無法創建影像數據');
            }

            // 傳送到後端
            await sendFrameToRecognition(blob);
        } catch (err) {
            console.error('處理影片幀時發生錯誤：', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const sendFrameToRecognition = async (imageBlob) => {
        try {
            const formData = new FormData();
            formData.append('image', imageBlob, 'frame.jpg');

            console.log('發送影片幀進行辨識...');

            const response = await fetch('http://localhost:8080/api/sign-language-recognition/frame', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`伺服器錯誤： ${response.status}`);
            }

            const data = await response.json();
            console.log('辨識結果：', data);

            if (data.success && data.text) {
                const oldResultLength = result.length();
                updateRecognizedText(data.text);
            }
        } catch (err) {
            console.error('發送影像到後端時發生錯誤：', err);
        }
    };

    const updateRecognizedText = (newText) => {
        if (!newText || newText.trim() === '') return;

        // avoid 添加相同文本
        setResult(prevText => {
            const lastText = lastRecognizedTextRef.current;

            // 新文本 === 最後辨識結果 -> 不更新
            if (newText === lastText) {
                return prevText;
            }

            // 檢查新文本是否部分重複
            if (lastText && (newText.includes(lastText) || lastText.includes(newText))) {
                // 選擇更長文本
                const updatedText = newText.length > lastText.length ? newText : lastText;
                // renew
                lastRecognizedTextRef.current = updatedText;
                // 如果 prevText 為空，直接 return updatedText
                if (!prevText) return updatedText;
                // 避免尾末重複
                const words = prevText.split(' ');
                const lastWords = words.slice(Math.max(0, words.length - 5)).join(' ');  // 提取這個數組的最後 5 個單詞

                if (updatedText.startsWith(lastWords)) {
                    const newContent = prevText + ' ' + updatedText.substring(lastWords.length).trim();
                    return newContent;
                } else {
                    return prevText + ' ' + updatedText;
                }
            }

            // 全新文本直接新增
            lastRecognizedTextRef.current = newText;
            const newContent = prevText ? prevText + ' ' + newText : newText;
            return newContent;
        })

    }

    // 原錄製功能保留、新增即時辨識
>>>>>>> Stashed changes
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
    };

    const analyzeLatestVideo = async () => {
        try {
            console.log('呼叫 /api/analyze_latest 進行辨識...');
            const response = await fetch('http://localhost:8080/api/analyze_latest');
            const data = await response.json();

            if (response.ok) {
                if (Array.isArray(data.result)) {
                    const sentence = data.result.join(' ');
                    setResult(sentence);
                    console.log('分析結果:', sentence);
                } else {
                    setResult(data.result); // e.g., 沒有偵測到任何手語
                    console.warn('非陣列結果:', data.result);
                }
            } else {
                setResult(`錯誤：${data.error}`);
            }
        } catch (error) {
            console.error('辨識 API 呼叫失敗:', error);
            setResult('辨識過程發生錯誤');
        }
    };

    const handleCancel = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setRecognitionStatus('idle');
        navigate('/conversation', { state: { selectedBranch } });
    };

    return (
        <div className='sign-language-recognition-screen'>
            <Header title={selectedBranch || '手語／語音辨識系統'} showBackButton={handleCancel} />
            <div className='recognition-container'>
                <div className='video-container'>
                   <img
                    src="http://localhost:5000/video_feed"
                    alt="即時影像串流"
                    className={`mirror-video ${isRecording ? 'recording' : ''}`}
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
