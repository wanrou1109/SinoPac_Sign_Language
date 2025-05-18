import cv2
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
import numpy as np
import mediapipe as mp
import threading

app = Flask(__name__)
CORS(app)

# 載入模型與標籤
model = load_model("App/Model/model_hands4_v2.keras")
actions = np.array([
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'check', 'finish', 'give_you', 'good', 'i', 'id_card', 'is',
    'money', 'saving_book', 'sign', 'taiwan', 'take', 'ten_thousand', 'yes'
])

output_frame = None
lock = threading.Lock()
result_text = ""

mp_hands = mp.solutions.hands

def extract_hand_landmarks(image):
    with mp_hands.Hands(static_image_mode=False, max_num_hands=2, min_detection_confidence=0.5) as hands:
        results = hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        if results.multi_hand_landmarks:
            all_landmarks = []
            for hand_landmarks in results.multi_hand_landmarks:
                hand = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark]).flatten()
                all_landmarks.append(hand)
            # 補齊為兩隻手，共 126 維
            while len(all_landmarks) < 2:
                all_landmarks.append(np.zeros(63))
            return np.concatenate(all_landmarks)
        return None

def generate_video():
    global output_frame, result_text
    cap = cv2.VideoCapture(0)
    sequence = []
    SEQ_LEN = 30

    while True:
        success, frame = cap.read()
        if not success:
            break

        data = extract_hand_landmarks(frame)
        if data is not None:
            sequence.append(data)
            if len(sequence) > SEQ_LEN:
                sequence = sequence[-SEQ_LEN:]

            if len(sequence) == SEQ_LEN:
                input_data = np.expand_dims(sequence, axis=0)
                prediction = model.predict(input_data, verbose=0)[0]
                predicted_label = actions[np.argmax(prediction)]
                result_text = predicted_label
                cv2.putText(frame, f'{predicted_label}', (10, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        with lock:
            output_frame = frame.copy()

        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_video(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/get_result', methods=['GET'])
def get_result():
    return jsonify({'result': result_text})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
