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

    // 手語辨識模擬回應
<<<<<<< Updated upstream
=======
    /*
>>>>>>> Stashed changes
    useEffect(() => {
        if(isRecording) {
            // 模擬手語辨識結果
            const timer = setTimeout(() => {
                setResult('（模擬）：我要辦理存款。');
            }, 1500);

            return () => clearTimeout(timer);
        }
<<<<<<< Updated upstream
    }, [isRecording]);
=======
    }, [isRecording]);*/
>>>>>>> Stashed changes

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
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
            console.warn('沒有進行中的錄製');
            return;
        }

        console.log('停止錄製');
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecognitionStatus('processing');

        // 處理錄好的影像
        mediaRecorderRef.current.onstop = async () => {
            try {
                console.log(`錄製完成，共 ${recordedChuncksRef.current.length} 個片段`);
                if (recordedChuncksRef.current.length === 0) {
                    throw new Error('未收到任何視訊資料');
                }
                
                // 創建 Blob
                const blob = new Blob(recordedChuncksRef.current, { type: 'video/webm' });
                console.log(`視訊檔案大小: ${blob.size} 位元組`);
                
                if (blob.size === 0) {
                    throw new Error('視訊檔案大小為 0');
                }
                
                // 上傳影片
                await uploadVideoToServer(blob);
                
                // 模擬處理延遲
                setTimeout(() => {
                    setRecognitionStatus('idle');

                    // 編輯或新增訊息
                    if (editMessageID) {
                        editMessage(editMessageID, result);
                    } else {
                        addMessage(result, 'customer');
                    }

                    // 回 conversation page
                    navigate('/conversation', { state: { selectedBranch } });
                }, 1500);
            } catch (error) {
                console.error('處理錄製視訊失敗：', error);
                setRecognitionStatus('idle');
                alert('處理視訊失敗，請重試: ' + error.message);
            }
        };
    };

    const uploadVideoToServer = async (videoBlob) => {
<<<<<<< Updated upstream
        const formData = new FormData();
        formData.append('video', videoBlob, 'sign-language-recording.webm');
    
        console.log('準備上傳視訊檔案');
        console.log('視訊檔案大小:', videoBlob.size, '位元組');
    
        try {
            console.log('開始上傳視訊檔案到 /api/upload/video');
    
            const response = await fetch('http://localhost:8080/api/upload/video', {
                method: 'POST',
                body: formData,
                mode: 'cors',
                credentials: 'omit',
            });
    
            console.log('收到伺服器回應', response.status);
    
            if (!response.ok) {
                const errorText = await response.text();
                console.error('伺服器回應錯誤:', errorText);
                throw new Error(`伺服器回應錯誤: ${response.status} ${errorText}`);
            }
    
            const data = await response.json();
            console.log('伺服器回應數據', data);
    
            // ✅ 上傳成功後自動觸發分析最新影片
            await analyzeLatestVideo();
    
            return data;
        } catch (error) {
            console.error('上傳過程中發生錯誤:', error);
            throw error;
        }
    };
    
    // 🔁 呼叫 /api/analyze_latest 並將結果設定給前端
    const analyzeLatestVideo = async () => {
        try {
            console.log('呼叫 /api/analyze_latest 進行辨識...');
            const response = await fetch('http://localhost:8080/api/analyze_latest');
            const data = await response.json();
    
            if (response.ok) {
                const sentence = data.result.join(' ');
                setResult(sentence);
                console.log('分析結果:', sentence);
            } else {
                console.error('分析錯誤:', data.error);
                setResult(`錯誤：${data.error}`);
            }
        } catch (error) {
            console.error('辨識 API 呼叫失敗:', error);
            setResult('辨識過程發生錯誤');
        }
    };
    
=======
    const formData = new FormData();
    formData.append('video', videoBlob, 'sign-language-recording.webm');

    console.log('準備上傳視訊檔案');
    console.log('視訊檔案大小:', videoBlob.size, '位元組');

    try {
        console.log('開始上傳視訊檔案到 /api/upload/video');

        const response = await fetch('http://localhost:8080/api/upload/video', {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'omit',
        });

        console.log('收到伺服器回應', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('伺服器回應錯誤:', errorText);
            throw new Error(`伺服器回應錯誤: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log('伺服器回應數據', data);

        // ✅ 上傳成功後自動觸發分析最新影片
        await analyzeLatestVideo();

        return data;
    } catch (error) {
        console.error('上傳過程中發生錯誤:', error);
        throw error;
    }
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
                // result 不是陣列，直接顯示（如：沒有偵測到任何手語）
                console.warn('非預期結果:', data.result);
                setResult(data.result);
            }
        } else {
            console.error('分析錯誤:', data.error);
            setResult(`錯誤：${data.error}`);
        }
    } catch (error) {
        console.error('辨識 API 呼叫失敗:', error);
        setResult('辨識過程發生錯誤');
    }
};


>>>>>>> Stashed changes

    // 取消 and 返回
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
            <Header title = {selectedBranch || '手語／語音辨識系統'} showBackButton = {handleCancel} />

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