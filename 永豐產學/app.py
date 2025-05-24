import threading
from flask import Flask, Response, jsonify, request, make_response
from flask_cors import CORS
from tensorflow.keras.models import load_model
import numpy as np
import cv2
from PIL import Image

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# 載入模型與標籤
model = load_model("App/Model/model_hands4_v2.keras")
output_frame = None
lock = threading.Lock()
result_text = ""
accumulated_result = ""
last_label = None

# 手語標籤陣列
labels = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'check', 'finish', 'give_you', 'good', 'i', 'id_card', 'is',
    'money', 'saving_book', 'sign', 'taiwan', 'take', 'ten_thousand', 'yes'
]

# 新增: 單張圖片預測函式
def predict_image(img):
    # 假設圖片為 RGB 並需要 resize 成模型輸入大小，例如 (224, 224)
    img = img.resize((224, 224))
    img_array = np.array(img) / 255.0  # normalize if needed
    img_array = np.expand_dims(img_array, axis=0)
    predictions = model.predict(img_array)
    label_index = np.argmax(predictions)
    label = labels[label_index]
    return label

@app.route('/favicon.ico')
def favicon():
    return '', 204


# 新增: 前端測試後端連線用路由
@app.route('/api/test', methods=['GET'])
def test_connection():
    return jsonify({'message': 'Backend is working.'})

@app.route('/handlanRes', methods=['GET'])
def handlanRes():
    global output_frame
    def generate():
        while True:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/getRes', methods=['GET'])
def getRes():
    global result_text
    return jsonify({'result': result_text})
# 新增: 上傳單張影像並執行模型推論
@app.route('/api/sign-language-recognition/frame', methods=['POST'])
def recognize_from_keypoints():
    # 目前處理的是單隻手資料時補齊成雙手
    try:
        data = request.get_json()
        if not data or 'keypoints' not in data:
            return jsonify({'success': False, 'error': '缺少 keypoints'}), 400

        keypoints = data['keypoints']

        if not isinstance(keypoints, list) or len(keypoints) < 30:
            return jsonify({'success': False, 'error': 'keypointsArray 資料不足，需 30 幀'}), 400

        keypoints = keypoints[-30:]

        for i in range(len(keypoints)):
            print(f'[DEBUG] 第 {i} 幀長度: {len(keypoints[i])}')
            if len(keypoints[i]) == 63:
                keypoints[i] += [0.0] * 63
            elif len(keypoints[i]) != 126:
                print('[ERROR] 接收到的資料:', keypoints)
                return jsonify({'success': False, 'error': f'格式錯誤，第 {i} 幀長度為 {len(keypoints[i])}，預期 63 或 126'}), 400

        keypoints_np = np.array(keypoints).astype(np.float32).reshape(1, 30, 126)
        predictions = model.predict(keypoints_np)
        label_index = np.argmax(predictions)
        label = labels[label_index]

        global accumulated_result
        global last_label
        is_digit = label in ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

        if not is_digit and label == last_label:
            return jsonify({'success': False, 'error': '重複詞略過'})
        else:
            last_label = label

        if label == 'finish':
            final_text = accumulated_result.strip()
            accumulated_result = ""
            return jsonify({'success': True, 'text': '輸入完成', 'raw_label': final_text})
        else:
            accumulated_result += label + " "
            return jsonify({'success': True, 'text': label})

    except Exception as e:
        print('[ERROR] 推論錯誤:', e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/process_pdf', methods=['POST'])
def process_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    # 在這裡加入實際處理 PDF 的邏輯，例如使用 PyMuPDF 提取文字或圖片等
    # 目前僅回傳成功訊息
    return jsonify({'message': 'PDF processed successfully'})

if __name__ == '__main__':
    app.run(debug=True, port=5050)