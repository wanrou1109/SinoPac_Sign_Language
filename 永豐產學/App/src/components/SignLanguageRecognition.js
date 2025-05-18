import React, { useState, useEffect, useRef } from 'react';
import * as handsModule from "@mediapipe/hands";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { Camera } from "@mediapipe/camera_utils";
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext.js';
import Header from './Header.js';
import '../styles/SignLanguageRecognition.css';

const SignLanguageRecognition = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addMessage, editMessage, setRecognitionStatus, recognitionStatus, setConversations } = useAppContext();
    const [ isRecording, setIsRecording ] = useState(false);
    const [ result, setResult ] = useState('');
    const [ isProcessing, setIsProcessing ] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const streamRef = useRef(null);
    const recognitionIntervalRef = useRef(null);
    const lastRecognizedTextRef = useRef('');
    const resultBoxRef = useRef(null);
    const keypointsBuffer = useRef([]);
    const editMessageID = location.state?.messageID;

    useEffect(() => {
        const setupCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                const hands = new handsModule.Hands({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
                });

                hands.setOptions({
                    maxNumHands: 2,
                    modelComplexity: 1,
                    minDetectionConfidence: 0.7,
                    minTrackingConfidence: 0.5,
                });

                hands.onResults((results) => {
                    const canvasCtx = canvasRef.current.getContext('2d');
                    canvasCtx.clearRect(0, 0, 640, 480);
                    canvasCtx.save();
                    canvasCtx.translate(640, 0);
                    canvasCtx.scale(-1, 1);
                    if (videoRef.current) {
                        canvasCtx.drawImage(videoRef.current, 0, 0, 640, 480);
                    }

                    if (results.multiHandLandmarks) {
                        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                            const landmarks = results.multiHandLandmarks[i];
                            let handedness = results.multiHandedness?.[i]?.label || '';
                            const flippedLandmarks = landmarks.map(pt => ({ ...pt, x: 1.0 - pt.x }));
                            const cx = flippedLandmarks[0].x * 640;
                            const cy = flippedLandmarks[0].y * 480;

                            drawConnectors(canvasCtx, flippedLandmarks, handsModule.HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
                            drawLandmarks(canvasCtx, flippedLandmarks, { color: '#FF0000', lineWidth: 1 });

                            canvasCtx.font = "16px Arial";
                            canvasCtx.fillStyle = "blue";
                            canvasCtx.scale(-1, 1); // undo mirror
                            canvasCtx.fillText(handedness, -cx, cy - 10); // flip x back
                            canvasCtx.scale(-1, 1); // restore mirror
                        }
                    }
                    canvasCtx.restore();

                    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                        let leftHand = null;
                        let rightHand = null;

                        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                            const handLabel = results.multiHandedness?.[i]?.label;
                            if (handLabel === 'Left') {
                                rightHand = results.multiHandLandmarks[i]; // flipped
                            } else if (handLabel === 'Right') {
                                leftHand = results.multiHandLandmarks[i]; // flipped
                            }
                        }

                        const leftFlat = leftHand ? leftHand.flatMap(pt => [pt.x, pt.y, pt.z]) : new Array(63).fill(0);
                        const rightFlat = rightHand ? rightHand.flatMap(pt => [pt.x, pt.y, pt.z]) : new Array(63).fill(0);
                        const combined = [...leftFlat, ...rightFlat];

                        keypointsBuffer.current.push(combined);
                        if (keypointsBuffer.current.length > 30) {
                            keypointsBuffer.current.shift();
                        }

                        window.keypointsArray = [...keypointsBuffer.current];
                    } else {
                        keypointsBuffer.current = [];
                        window.keypointsArray = [];
                    }
                });

                const camera = new Camera(videoRef.current, {
                    onFrame: async () => {
                        const flippedCanvas = document.createElement('canvas');
                        flippedCanvas.width = 640;
                        flippedCanvas.height = 480;
                        const flippedCtx = flippedCanvas.getContext('2d');
                        flippedCtx.translate(640, 0);
                        flippedCtx.scale(-1, 1);
                        flippedCtx.drawImage(videoRef.current, 0, 0, 640, 480);
                        await hands.send({ image: flippedCanvas });
                    },
                    width: 640,
                    height: 480,
                });
                camera.start();
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

            if (recognitionIntervalRef.current) {
                clearInterval(recognitionIntervalRef.current);
                recognitionIntervalRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        fetch('/api/test')
        .then(response => {
            if (!response.ok) throw new Error(`後端錯誤：${response.status}`);
            return response.json();
        })
        .then(data => console.log('後端連接測試成功:', data))
        .catch(error => console.error('後端連接錯誤:', error));
    }, []);

    const startPeriodicRecognition = () => {
        recognitionIntervalRef.current = setInterval(() => {
            if (!isProcessing) captureAndRecognize();
        }, 1000);
    };

    const captureAndRecognize = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
            setIsProcessing(true);
            const canvas = document.createElement('canvas');
            const videoElement = videoRef.current;
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            setTimeout(() => sendFrameToRecognition(), 0);
        } catch (err) {
            console.error('處理影片幀時發生錯誤：', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const sendFrameToRecognition = async () => {
        try {
            const keypointsArray = window.keypointsArray;
            if (!keypointsArray || keypointsArray.length !== 30) throw new Error('keypointsArray 資料不足，需 30 幀');
            const totalLength = keypointsArray.reduce((sum, row) => sum + row.length, 0);
            if (totalLength !== 30 * 126) throw new Error(`格式錯誤，應為 (30, 126)，目前為 (30, ${totalLength / 30})`);

            const response = await fetch('/api/sign-language-recognition/frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keypoints: keypointsArray })
            });

            if (!response.ok) throw new Error(`伺服器錯誤： ${response.status}`);
            const data = await response.json();
            if (data.success && data.text) updateRecognizedText(data.text);
        } catch (err) {
            console.error('發送節點到後端時發生錯誤：', err);
        }
    };

    const updateRecognizedText = (newText) => {
        if (!newText || newText.trim() === '') return;
        setResult(prev => {
            const last = lastRecognizedTextRef.current;
            if (newText === "請打下一個字") return prev + '\n請打下一個字';
            if (newText === last) return prev;
            lastRecognizedTextRef.current = newText;
            return prev + newText;
        });
    };

    const handleStartRecording = () => {
        if (!streamRef.current) return alert('鏡頭尚未準備就緒');
        setResult('');
        lastRecognizedTextRef.current = '';
        recordedChunksRef.current = [];

        const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
        mediaRecorder.onstop = async () => {
            clearInterval(recognitionIntervalRef.current);
            recognitionIntervalRef.current = null;
            try {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                if (blob.size === 0) throw new Error('視訊檔案為空');
                setTimeout(() => {
                    setRecognitionStatus('idle');
                    if (editMessageID) editMessage(editMessageID, result);
                    else addMessage(result, 'customer');
                    navigate('/conversation');
                }, 1000);
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
        startPeriodicRecognition();
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
        setIsRecording(false);
        setRecognitionStatus('processing');
    };

    const handleBack = () => {
        if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
        clearInterval(recognitionIntervalRef.current);
        recognitionIntervalRef.current = null;
        setIsRecording(false);
        setRecognitionStatus('idle');
        navigate('/conversation');
    };

    return (
        <div className='sign-language-recognition-screen'>
            <Header showBackButton={true} onBack={handleBack}/>
            <div className='recognition-container'>
                <div className='video-container'>
                    <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }}/>
                    <canvas ref={canvasRef} className="overlay-canvas" width={640} height={480}/>
                    {isProcessing && <div className='processing-indicator'>辨識中...</div>}
                </div>

                <div className={`recognition-result ${isRecording ? 'visible' : 'hidden'}`}>
                    <h3>即時辨識結果：</h3>
                    <div ref={resultBoxRef} className={`result-text ${result ? 'has-content' : ''}`}>
                        {result ? (
                            <div className="recognized-summary">
                                <div className="prompt">請打下一個字</div>
                                <div><strong>目前已輸入：</strong> {result.replace(/請打下一個字/g, '').trim()}</div>
                            </div>
                        ) : '等待手語辨識...'}
                    </div>
                    {isRecording && <div className="live-indicator">即時更新中</div>}
                </div>
            </div>
            <div className='action-bar'>
                {!isRecording ? (
                    <button className='record-button' onClick={handleStartRecording} disabled={recognitionStatus === 'processing'}>
                        <div className='button-inner'></div>
                    </button>
                ) : (
                    <button className='record-button recording-active' onClick={handleStopRecording}>
                        <div className='button-inner'></div>
                    </button>
                )}
            </div>
        </div>
    );
};

export default SignLanguageRecognition;