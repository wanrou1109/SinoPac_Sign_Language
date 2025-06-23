def start():
    import cv2
    import numpy as np
    import time
    import requests
    import mediapipe as mp
    from PIL import ImageFont, ImageDraw, Image
    from collections import Counter
    from tensorflow.keras.models import load_model

    actions = np.array([
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        'check', 'finish', 'give_you', 'good', 'i', 'id_card',
        'is', 'money', 'saving_book', 'sign', 'taiwan', 'take',
        'ten_thousand', 'yes'
    ])


    new_model = load_model('App/Model/model_hands4_v2.keras')
    mp_holistic = mp.solutions.holistic
    mp_drawing = mp.solutions.drawing_utils

    def mediapipe_detection(image, model):
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        return model.process(image)

    def extract_keypoints_without_face(results):
        lh = np.array([[res.x, res.y, res.z] for res in results.left_hand_landmarks.landmark]) if results.left_hand_landmarks else np.zeros((21, 3))
        rh = np.array([[res.x, res.y, res.z] for res in results.right_hand_landmarks.landmark]) if results.right_hand_landmarks else np.zeros((21, 3))
        return np.concatenate([lh, rh]).flatten()

    def draw_styled_landmarks(image, results):
        mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
        mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS)

    cap = cv2.VideoCapture(0)
    sequence, sentence, predictions = [], [], []
    threshold = 0.7
    alarm_set = False
    trans_result = ""

    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            results = mediapipe_detection(frame, holistic)
            draw_styled_landmarks(frame, results)
            keypoints = extract_keypoints_without_face(results)

            if np.count_nonzero(keypoints) > 30:
                sequence.append(keypoints)
                sequence = sequence[-30:]

            if len(sequence) == 30:
                res = new_model.predict(np.expand_dims(sequence, axis=0))[0]
                if res[np.argmax(res)] > threshold:
                    predictions.append(np.argmax(res))

                if Counter(predictions[-10:]).most_common(1)[0][0] == np.argmax(res):
                    current_action = actions[np.argmax(res)]
                    if len(sentence) == 0 or current_action != sentence[-1]:
                        sentence.append(current_action)
                        sequence = []
                        last_updated_time = time.time()
                        alarm_set = True

            if len(sentence) > 5:
                sentence = sentence[-5:]

            current_time = time.time()
            if alarm_set and current_time - last_updated_time >= 10:
                trans_result = ' '.join(sentence)
                print('---結果---', trans_result)
                try:
                    requests.post('http://localhost:5000/handlanRes', data={'result': trans_result})
                except Exception as e:
                    print("POST error:", e)
                alarm_set = False
                sequence = []
                sentence = []

            # 顯示翻譯結果（用 PIL 顯示中文字）
            img = np.zeros((40, 640, 3), dtype='uint8')
            try:
                font = ImageFont.truetype("arial.ttf", 20)
            except OSError:
                font = ImageFont.load_default()
            img_pil = Image.fromarray(img)
            draw = ImageDraw.Draw(img_pil)
            draw.text((0, 0), trans_result, fill=(255, 255, 255), font=font)
            img = np.array(img_pil)

            cv2.rectangle(frame, (0, 0), (640, 40), (245, 117, 16), -1)
            cv2.putText(frame, ' '.join(sentence), (3, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            if frame.shape[1] != img.shape[1]:
                img = cv2.resize(img, (frame.shape[1], img.shape[0]))
            if frame.dtype != img.dtype:
                img = img.astype(frame.dtype)

            output_frame = cv2.vconcat([frame, img])
            ret, buffer = cv2.imencode('.jpg', output_frame)
            frame = buffer.tobytes()

            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

            if cv2.waitKey(10) & 0xFF == ord('x'):
                break

        cap.release()
        cv2.destroyAllWindows()