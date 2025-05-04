from flask import Flask, jsonify, request
import os
import cv2
import numpy as np
import mediapipe as mp
from tensorflow.keras.models import load_model
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)  # ✅ 完全啟用 CORS，不限制路徑與來源


# 上傳影片儲存位置
UPLOAD_FOLDER = os.path.join('app', 'server', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

<<<<<<< Updated upstream
# 載入訓練好的模型與標籤
model = load_model('Model/model_hands4.keras')
=======
# 載入模型與手語標籤（126維：21點x左右手x3D）
model = load_model('App/Model/model_hands4_v2.keras')
>>>>>>> Stashed changes
actions = np.array([
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'check', 'finish', 'give_you', 'good', 'i', 'id_card', 'is',
    'money', 'saving_book', 'sign', 'taiwan', 'take', 'ten_thousand', 'yes'
])

@app.route('/api/test', methods=['GET'])
def test_connection():
    return jsonify({'status': 'OK', 'message': '後端連接成功'}), 200

@app.route('/api/upload/video', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({'error': '未提供視訊檔案'}), 400

    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({'error': '檔案名稱為空'}), 400

    save_path = os.path.join(UPLOAD_FOLDER, video_file.filename)
    video_file.save(save_path)

    return jsonify({
        'success': True,
        'message': '視訊上傳成功',
        'file': {
            'filename': video_file.filename,
            'path': save_path,
            'size': os.path.getsize(save_path),
            'mimetype': video_file.mimetype
        }
    }), 200

@app.route('/api/analyze_latest', methods=['GET'])
def analyze_latest():
    video_path = get_latest_video_file()
    if not video_path:
        return jsonify({'error': 'No video files found'}), 404

    result = analyze_video(video_path)

    if not result:
        return jsonify({
            'result': [],
            'message': '沒有偵測到任何手語',
            'file': os.path.basename(video_path)
        }), 200

    return jsonify({
        'result': result,
        'message': '辨識完成',
        'file': os.path.basename(video_path)
    }), 200

def get_latest_video_file():
    files = [os.path.join(UPLOAD_FOLDER, f) for f in os.listdir(UPLOAD_FOLDER)
             if f.lower().endswith(('.webm', '.mp4', '.avi'))]
    return max(files, key=os.path.getmtime) if files else None

def analyze_video(path):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
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
        # ✅ 確保同時抓左右手的資料
        if res.left_hand_landmarks:
            data.extend(to_np(res.left_hand_landmarks))
        else:
            data.extend(np.zeros(21 * 3))  # 左手沒抓到要補 0
        if res.right_hand_landmarks:
            data.extend(to_np(res.right_hand_landmarks))
        else:
            data.extend(np.zeros(21 * 3))  # 右手沒抓到要補 0
        return np.array(data) if data else None



    with mp_holistic.Holistic(static_image_mode=False) as holistic:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = holistic.process(image)
            data = extract_landmarks(result)

            is_almost_static = False
            if data is not None and prev_data is not None:
                delta = np.linalg.norm(data - prev_data)
                is_almost_static = delta < 0.01
            prev_data = data

            if data is None or is_almost_static:
                silence_count += 1
                if silence_count == WORD_GAP_FRAMES and sequence:
                    word = predict_action(sequence)
                    if word:
                        results.append(word)
                    sequence = []
                if silence_count >= END_GAP_FRAMES:
                    break
            else:
                silence_count = 0
                sequence.append(data)

        if sequence:
            word = predict_action(sequence)
            if word:
                results.append(word)

    cap.release()
    return results

def predict_action(sequence):
    SEQ_LEN = 30
    sequence = [s for s in sequence if s is not None]
    if not sequence:
        return None
    sequence = sequence[-SEQ_LEN:]
    if len(sequence) < SEQ_LEN:
        sequence = np.pad(sequence, ((0, SEQ_LEN - len(sequence)), (0, 0)), mode='constant')
    else:
        sequence = np.array(sequence)
    input_data = np.expand_dims(sequence, axis=0)  # (1, 30, 126)
    prediction = model.predict(input_data)[0]
    return actions[np.argmax(prediction)]

if __name__ == '__main__':
    app.run(debug=True, port=8080)
