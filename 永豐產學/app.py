from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import tensorflow as tf

app = Flask(__name__)
CORS(app)

# 載入模型
model = tf.keras.models.load_model('model_hands4_v2.keras')

@app.route('/api/test', methods=['GET'])
def test_api():
    return jsonify({"message": "Backend is working."})

@app.route('/api/sign-language-recognition/frame', methods=['POST'])
def recognize_frame():
    try:
        data = request.get_json()
        keypoints = data.get('keypoints')

        if not keypoints or len(keypoints) != 30:
            return jsonify({"success": False, "error": "keypoints must be 30 frames"}), 400

        array = np.array(keypoints)

        # 自動檢查每幀是否為 63 維或 126 維（單手或雙手）
        frame_shape = array.shape[1]
        if frame_shape not in [63, 126]:
            return jsonify({"success": False, "error": f"Each frame must have 63 or 126 values, got {frame_shape}"}), 400

        # 單手補0
        if frame_shape == 63:
            zero_padding = np.zeros((30, 63))
            array = np.concatenate([array, zero_padding], axis=1)

        # reshape 為模型需要的 (1, 30, 126)
        array = array.reshape(1, 30, 126)

        prediction = model.predict(array)
        predicted_label = np.argmax(prediction)

        return jsonify({"success": True, "label": int(predicted_label), "text": str(predicted_label)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5050)