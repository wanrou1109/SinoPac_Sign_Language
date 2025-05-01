from flask import Flask, jsonify
import os
import cv2
import numpy as np
import mediapipe as mp
from tensorflow.keras.models import load_model

app = Flask(__name__)

# 設定影片資料夾
UPLOAD_FOLDER = os.path.join('app', 'server', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 載入模型與標籤
model = load_model('Model/model_hands4.keras')
actions = np.array(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'check', 'finish', 'give_you',
                    'good', 'i', 'id_card', 'is', 'money', 'saving_book', 'sign', 'taiwan', 'take', 'ten_thousand', 'yes'])

# 找出最新上傳的影片檔案
def get_latest_video_file():
    files = [os.path.join(UPLOAD_FOLDER, f) for f in os.listdir(UPLOAD_FOLDER)
             if f.lower().endswith(('.webm', '.mp4', '.avi'))]
    if not files:
        return None
    return max(files, key=os.path.getmtime)

# API：分析最新影片
@app.route('/api/analyze_latest', methods=['GET'])
def analyze_latest():
    video_path = get_latest_video_file()
    if not video_path:
        return jsonify({'error': 'No video files found'}), 404

    result = analyze_video(video_path)
    return jsonify({'result': result, 'file': os.path.basename(video_path)})

# 預測影片內容
def analyze_video(path):
    cap = cv2.VideoCapture(path)
    mp_holistic = mp.solutions.holistic
    results = []
    sequence = []
    silence_count = 0
    SILENCE_THRESHOLD = 15

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

            if data is None:
                silence_count += 1
                if silence_count >= SILENCE_THRESHOLD and sequence:
                    word = predict_action(sequence)
                    if word:
                        results.append(word)
                    sequence = []
            else:
                silence_count = 0
                sequence.append(data)

        if sequence:
            word = predict_action(sequence)
            if word:
                results.append(word)

    cap.release()
    return results

# 使用模型預測動作
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
