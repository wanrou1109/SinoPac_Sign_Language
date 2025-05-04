from flask import Flask, jsonify
import os
import cv2
import numpy as np
import mediapipe as mp
from tensorflow.keras.models import load_model
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允許跨來源請求（前端開發時用）

# ===============================
# API: /api/test
# 測試後端是否正常
# 回傳格式：
# {
#   "status": "OK",
#   "message": "後端連接成功"
# }
# ===============================
@app.route('/api/test', methods=['GET'])
def test_connection():
    return jsonify({'status': 'OK', 'message': '後端連接成功'}), 200

# 設定影片儲存路徑
UPLOAD_FOLDER = os.path.join('app', 'server', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 載入訓練好的模型與標籤
model = load_model('App/Model/model_hands4_v2.keras')
actions = np.array([
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'check', 'finish', 'give_you', 'good', 'i', 'id_card', 'is',
    'money', 'saving_book', 'sign', 'taiwan', 'take', 'ten_thousand', 'yes'
])

# 取得最新影片路徑
def get_latest_video_file():
    files = [os.path.join(UPLOAD_FOLDER, f) for f in os.listdir(UPLOAD_FOLDER)
             if f.lower().endswith(('.webm', '.mp4', '.avi'))]
    if not files:
        return None
    return max(files, key=os.path.getmtime)

# ===============================
# API: /api/analyze_latest
# 分析最新上傳的影片，做手語斷詞與辨識
# 回傳格式：
# 正常情況：
# {
#   "result": ["我", "要", "辦理", "存款"],
#   "file": "sign-language-recording.webm"
# }
# 若無影片可供分析：
# {
#   "error": "No video files found"
# }
# ===============================
@app.route('/api/analyze_latest', methods=['GET'])
def analyze_latest():
    video_path = get_latest_video_file()
    if not video_path:
        return jsonify({'error': 'No video files found'}), 404

    result = analyze_video(video_path)
    return jsonify({'result': result, 'file': os.path.basename(video_path)})

# 主影片分析函數
def analyze_video(path):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30

    # 1秒視為詞結束 / 3秒視為整段結束
    WORD_GAP_FRAMES = int(1 * fps)
    END_GAP_FRAMES = int(3 * fps)

    mp_holistic = mp.solutions.holistic
    results = []
    sequence = []
    silence_count = 0
    prev_data = None

    def extract_landmarks(res):
        def to_np(landmarks):
            return np.array([[lm.x, lm.y, lm.z] for lm in landmarks.landmark]).flatten()
        data = []
        if res.pose_landmarks:
            data.extend(to_np(res.pose_landmarks))
        if res.left_hand_landmarks:
            data.extend(to_np(res.left_hand_landmarks))
        if res.right_hand_landmarks:
            data.extend(to_np(res.right_hand_landmarks))
        return np.array(data) if data else None

    with mp_holistic.Holistic(static_image_mode=False) as holistic:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = holistic.process(image)
            data = extract_landmarks(result)

            # 容錯斷詞：骨架動作變化量小也算靜止
            is_almost_static = False
            if data is not None and prev_data is not None:
                delta = np.linalg.norm(data - prev_data)
                is_almost_static = delta < 0.01  # 容錯閾值，可調整
            prev_data = data

            if data is None or is_almost_static:
                silence_count += 1

                # 斷詞判斷
                if silence_count == WORD_GAP_FRAMES and sequence:
                    word = predict_action(sequence)
                    if word:
                        results.append(word)
                    sequence = []

                # 結束判斷
                if silence_count >= END_GAP_FRAMES:
                    break
            else:
                silence_count = 0
                sequence.append(data)

        # 最後一段 sequence 預測（影片結束）
        if sequence:
            word = predict_action(sequence)
            if word:
                results.append(word)

    cap.release()
    return results

# 用模型預測一段手語序列
def predict_action(sequence):
    SEQ_LEN = 30
    sequence = sequence[-SEQ_LEN:]
    if len(sequence) < SEQ_LEN:
        sequence = np.pad(sequence, ((0, SEQ_LEN - len(sequence)), (0, 0)), mode='constant')
    else:
        sequence = np.array(sequence)

    input_data = np.expand_dims(sequence, axis=0)
    prediction = model.predict(input_data)[0]
    return actions[np.argmax(prediction)]

if __name__ == '__main__':
    app.run(debug=True)
