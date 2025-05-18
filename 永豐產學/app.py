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
    try:
        data = request.get_json()
        if not data or 'keypoints' not in data:
            return jsonify({'success': False, 'error': '缺少 keypoints'}), 400

        keypoints = data['keypoints']

        if not isinstance(keypoints, list) or len(keypoints) < 30:
            return jsonify({'success': False, 'error': 'keypointsArray 資料不足，需 30 幀'}), 400

        keypoints = keypoints[-30:]

        for i in range(len(keypoints)):
            if len(keypoints[i]) == 63:
                keypoints[i] += [0.0] * 63
            elif len(keypoints[i]) != 126:
                return jsonify({'success': False, 'error': f'第 {i} 幀長度錯誤，需為 126 維'}), 400

        keypoints_np = np.array(keypoints).astype(np.float32).reshape(1, 30, 126)
        predictions = model.predict(keypoints_np)
        label_index = np.argmax(predictions)
        label = labels[label_index]

        global accumulated_result
        if label == 'finish':
            final_text = accumulated_result.strip()
            accumulated_result = ""
            return jsonify({'success': True, 'text': '輸入完成', 'raw_label': final_text})
        else:
            accumulated_result += label + " "
            return jsonify({'success': True, 'text': '請打下一個字', 'raw_label': label})

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
    # 假設這裡有處理 PDF 的程式碼
    # 目前僅回傳成功訊息
    return jsonify({'message': 'PDF processed successfully'})

if __name__ == '__main__':
    app.run(debug=True, port=5050)