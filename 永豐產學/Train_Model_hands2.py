def start():
    """
    升級版手語辨識：支援新模型（含手臂特徵）
    Generator function that captures video frames, processes hand sign language recognition,
    and yields MJPEG frames suitable for streaming in a Flask response.
    """
    import cv2
    import numpy as np
    import time
    import requests
    import mediapipe as mp
    from PIL import ImageFont, ImageDraw, Image
    from collections import Counter
    import tensorflow as tf
    from tensorflow.keras.models import load_model
    from tensorflow.keras.layers import Layer
    import os

    # ==================== 自訂層定義 ====================
    class CustomLSTM(tf.keras.layers.LSTM):
        def __init__(self, *args, **kwargs):
            kwargs.pop('time_major', None)
            super().__init__(*args, **kwargs)

    class SelfAttention(Layer):
        def __init__(self, **kwargs):
            super().__init__(**kwargs)
            self.supports_masking = True

        def build(self, input_shape):
            d = int(input_shape[-1])
            self.W = self.add_weight(
                name="att_weight", shape=(d, 1),
                initializer="glorot_uniform", trainable=True
            )
            self.b = self.add_weight(
                name="att_bias", shape=(1,),
                initializer="zeros", trainable=True
            )
            super().build(input_shape)

        def call(self, x, mask=None):
            e = tf.nn.tanh(tf.tensordot(x, self.W, axes=[[2],[0]]) + self.b)
            if mask is not None:
                mask = tf.cast(mask, dtype=e.dtype)[:, :, tf.newaxis]
                e = e - (1.0 - mask) * 1e9
            alpha = tf.nn.softmax(e, axis=1)
            context = x * alpha
            return tf.reduce_sum(context, axis=1)

        def compute_mask(self, inputs, mask=None):
            return None

        def get_config(self):
            return super().get_config()

    # ==================== 骨架邊定義 ====================
    HAND_EDGES = [
        (0,1), (1,2), (2,3), (3,4),
        (0,5), (5,6), (6,7), (7,8),
        (0,9), (9,10), (10,11), (11,12),
        (0,13), (13,14), (14,15), (15,16),
        (0,17), (17,18), (18,19), (19,20),
        (5,9), (9,13), (13,17),
    ]

    ARM_EDGES = [
        ('left', 21, 22), ('left', 22, 23), ('left', 21, 23),
        ('right', 21, 22), ('right', 22, 23), ('right', 21, 23),
    ]

    # ==================== 特徵提取函數 ====================
    def _hand_xyz_from_results(hand_landmarks):
        xyz = np.zeros((21, 3), dtype=np.float32)
        if hand_landmarks:
            for i, lm in enumerate(hand_landmarks.landmark[:21]):
                xyz[i] = [lm.x, lm.y, lm.z]
        return xyz

    def _pose_landmarks_to_dict(pose_landmarks):
        arm_points = {'left': {}, 'right': {}}
        if pose_landmarks:
            landmarks = pose_landmarks.landmark
            arm_points['left'][21] = np.array([landmarks[11].x, landmarks[11].y, landmarks[11].z], dtype=np.float32)
            arm_points['left'][22] = np.array([landmarks[13].x, landmarks[13].y, landmarks[13].z], dtype=np.float32)
            arm_points['left'][23] = np.array([landmarks[15].x, landmarks[15].y, landmarks[15].z], dtype=np.float32)
            arm_points['right'][21] = np.array([landmarks[12].x, landmarks[12].y, landmarks[12].z], dtype=np.float32)
            arm_points['right'][22] = np.array([landmarks[14].x, landmarks[14].y, landmarks[14].z], dtype=np.float32)
            arm_points['right'][23] = np.array([landmarks[16].x, landmarks[16].y, landmarks[16].z], dtype=np.float32)
        return arm_points

    def _safe_dist(p_i, p_j):
        if p_i.sum() == 0.0 or p_j.sum() == 0.0:
            return 0.0
        diff = p_i - p_j
        return float(np.sqrt((diff * diff).sum()))

    def _hand_scale_ref(hand_xyz):
        eps = 1e-6
        d = _safe_dist(hand_xyz[0], hand_xyz[9])
        if d > 0:
            return max(d, eps)
        alts = [_safe_dist(hand_xyz[0], hand_xyz[j]) for j in (5,9,13,17)]
        alts = [a for a in alts if a > 0]
        return max(float(np.mean(alts)), eps) if alts else 1.0

    def _arm_scale_ref(arm_points):
        eps = 1e-6
        scales = []
        for side in ['left', 'right']:
            if 21 in arm_points[side] and 23 in arm_points[side]:
                d = _safe_dist(arm_points[side][21], arm_points[side][23])
                if d > 0:
                    scales.append(d)
        return max(float(np.mean(scales)), eps) if scales else 1.0

    def compute_hand_edge_distances(hand_xyz):
        scale = _hand_scale_ref(hand_xyz)
        feats = []
        for i, j in HAND_EDGES:
            d = _safe_dist(hand_xyz[i], hand_xyz[j]) / scale
            feats.append(d)
        return np.array(feats, dtype=np.float32)

    def compute_arm_edge_distances(arm_points):
        scale = _arm_scale_ref(arm_points)
        feats = []
        for side, i, j in ARM_EDGES:
            if i in arm_points[side] and j in arm_points[side]:
                d = _safe_dist(arm_points[side][i], arm_points[side][j]) / scale
                feats.append(d)
            else:
                feats.append(0.0)
        return np.array(feats, dtype=np.float32)

    def compute_hand_edge_directions(hand_xyz):
        scale = _hand_scale_ref(hand_xyz)
        vecs = []
        for i, j in HAND_EDGES:
            if hand_xyz[i].sum() == 0.0 or hand_xyz[j].sum() == 0.0:
                vecs.extend([0.0, 0.0, 0.0])
            else:
                v = (hand_xyz[j] - hand_xyz[i]) / scale
                vecs.extend(v.tolist())
        return np.array(vecs, dtype=np.float32)

    def extract_features_from_mediapipe(results, feat_dim, scaler=None):
        lh_xyz = _hand_xyz_from_results(results.left_hand_landmarks)
        rh_xyz = _hand_xyz_from_results(results.right_hand_landmarks)
        
        if feat_dim == 126:
            feat = np.concatenate([lh_xyz.flatten(), rh_xyz.flatten()])
        elif feat_dim == 46:
            feat = np.concatenate([
                compute_hand_edge_distances(lh_xyz),
                compute_hand_edge_distances(rh_xyz)
            ])
        elif feat_dim == 52:
            arm_points = _pose_landmarks_to_dict(results.pose_landmarks)
            feat = np.concatenate([
                compute_hand_edge_distances(lh_xyz),
                compute_hand_edge_distances(rh_xyz),
                compute_arm_edge_distances(arm_points)
            ])
        elif feat_dim == 138:
            feat = np.concatenate([
                compute_hand_edge_directions(lh_xyz),
                compute_hand_edge_directions(rh_xyz)
            ])
        else:
            raise ValueError(f"不支援的特徵維度：{feat_dim}")

        if scaler is not None:
            try:
                feat = scaler.transform(feat.reshape(1, -1))[0]
            except Exception:
                pass
        return feat.astype(np.float32)

    # ==================== 載入模型 ====================
    print("🚀 啟動手語辨識系統...")
    
    model_candidates = [
        "./App/Model/model_1101.keras",
        "./App/Model/model_1104_4da_min_delta=5e-4.keras",
        "./App/Model/model_1104_min_delta=5e-4.keras",
        "./App/Model/model_1104_overfitting.keras",
        "./App/Model/model_1104_twice_3da_min_delta=5e-4.keras",
        "./App/Model/model_1104_3da_min_delta=5e-4.keras",
        "./App/Model/model_1104_twice_2da_min_delta=5e-4.keras",
        "./App/Model/model_1104_5da_min_delta=5e-4.keras",
        "./App/Model/model_1104_twice_4da_min_delta=5e-4.keras",
        "./App/Model/model3_2da_atten_with_arm.keras",
        "./App/Model/model2_2da_with_arm.keras",
        "./App/Model/model1_jnoise_with_arm.keras",
        "./App/Model/yu2_2da_atten_0907.keras",
        "./App/Model/yu1_2da_0907.keras",
        "./App/Model/j1_0907_noise.keras",
        "App/Model/model_hands4_v2.keras",  # 舊模型備用
    ]
    
    new_model = None
    for mpath in model_candidates:
        try:
            new_model = load_model(
                mpath, 
                custom_objects={'SelfAttention': SelfAttention, 'CustomLSTM': CustomLSTM},
                compile=False
            )
            print(f"✅ 成功載入模型：{mpath}")
            break
        except Exception as e:
            print(f"⚠️ 嘗試載入 {mpath} 失敗：{e}")
    
    if new_model is None:
        print("❌ 無法載入任何模型")
        return

    # ==================== 解析模型參數 ====================
    try:
        in_shape = new_model.input.shape
        sequence_length = int(in_shape[1]) if in_shape[1] is not None else 30
        feat_dim = int(in_shape[2]) if in_shape[2] is not None else 52
    except Exception:
        sequence_length, feat_dim = 30, 52

    try:
        num_classes = int(new_model.output.shape[-1])
    except Exception:
        num_classes = 24

    print(f"🔍 序列長度: {sequence_length}, 特徵維度: {feat_dim}, 類別數: {num_classes}")

    # ==================== 動作標籤 ====================
    if num_classes == 5:
        actions = np.array(['apply_for', 'complete', 'no', 'problem', 'sign'])
    elif num_classes == 7:
        actions = np.array(['apply_for', 'life', 'me', 'no',
                            'problem', 'save_money', 'use'])
    elif num_classes == 8:
        actions = np.array(['apply_for', 'life', 'me', 'no', 'saving_book',
                            'problem', 'save_money', 'use'])
    elif num_classes == 10:
        actions = np.array(['complete', 'this', 'id_card', 'paper', 'sign',
                            'cover_name', 'various', 'use', 'life', 'want'])
    elif num_classes == 12:
        actions = np.array(['complete', 'apply_for', 'invest', 'cover_name', 'me',
                            'passbook', 'use', 'various', 'want', 'what', 'id_card', 'paper'])
    elif num_classes == 24:
        actions = np.array([
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            'check', 'finish', 'give_you', 'good', 'i', 'id_card',
            'is', 'money', 'saving_book', 'sign', 'taiwan', 'take',
            'ten_thousand', 'yes'
        ])
    else:
        actions = np.array(['apply_for', 'complete', 'no', 'problem', 'sign'])

    print(f"📋 動作標籤: {actions}")

    # ==================== 載入 Scaler（可選）====================
    scaler = None
    if feat_dim in [46, 52]:
        try:
            import joblib
            scaler_path = "./App/Model/edges_scaler.joblib"
            if os.path.exists(scaler_path):
                scaler = joblib.load(scaler_path)
                print(f"✅ 已載入 scaler")
        except Exception as e:
            print(f"ℹ️ 未載入 scaler: {e}")

    # ==================== MediaPipe 初始化 ====================
    mp_holistic = mp.solutions.holistic
    mp_drawing = mp.solutions.drawing_utils

    def mediapipe_detection(image, model):
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image.flags.writeable = False
        return model.process(image)

    def draw_styled_landmarks(image, results):
        mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS)
        mp_drawing.draw_landmarks(image, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
        mp_drawing.draw_landmarks(image, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS)

    # ==================== 主迴圈 ====================
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ 無法開啟攝影機")
        return

    sequence, sentence, predictions = [], [], []
    threshold = 0.7
    trans_result = ""
    last_updated_time = time.time()  # 最近一次「新增詞」的時間

    print("🎥 開始手語辨識...")

    with mp_holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5) as holistic:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            frame = cv2.flip(frame, 1)
            results = mediapipe_detection(frame, holistic)
            draw_styled_landmarks(frame, results)

            # ==================== 特徵提取 ====================
            try:
                keypoints = extract_features_from_mediapipe(results, feat_dim, scaler)
            except Exception as e:
                print(f"⚠️ 特徵提取錯誤: {e}")
                keypoints = None

            if keypoints is not None and np.count_nonzero(keypoints) > 10:
                sequence.append(keypoints)
                sequence = sequence[-sequence_length:]

            # ==================== 預測 ====================
            if len(sequence) == sequence_length:
                try:
                    res = new_model.predict(np.expand_dims(sequence, axis=0), verbose=0)[0]
                    if res[np.argmax(res)] > threshold:
                        predictions.append(np.argmax(res))

                    if len(predictions) >= 10:
                        most_common = Counter(predictions[-10:]).most_common(1)[0][0]
                        if most_common == np.argmax(res):
                            current_action = actions[np.argmax(res)]
                            # 只有與最後一個不同時才加入
                            if len(sentence) == 0 or current_action != sentence[-1]:
                                sentence.append(current_action)
                                # 只保留最後 5 個詞（若有需求）
                                if len(sentence) > 5:
                                    sentence = sentence[-5:]
                                sequence = []  # 重置序列以開始收集下一段
                                last_updated_time = time.time()

                                # === 有新詞就「立刻送出」更新 ===
                                trans_result = ' '.join(sentence)
                                print(f'---手語語序(更新)---: {trans_result}')
                                try:
                                    requests.post('http://localhost:5050/handlanRes',
                                                  data={'result': trans_result})
                                except Exception as e:
                                    print(f"❌ POST 錯誤: {e}")
                except Exception as e:
                    print(f"❌ 預測錯誤: {e}")

            # ==================== 動態清空：10s 無更新就清空 ====================
            current_time = time.time()
            if sentence and current_time - last_updated_time >= 10:
                print("⏱️ 10s 無更新，清空句子與序列")
                sequence = []
                predictions = []
                sentence = []
                trans_result = ""

            # ==================== 畫面顯示 ====================
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
            cv2.putText(frame, ' '.join(sentence), (3, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            if frame.shape[1] != img.shape[1]:
                img = cv2.resize(img, (frame.shape[1], img.shape[0]))
            if frame.dtype != img.dtype:
                img = img.astype(frame.dtype)

            output_frame = cv2.vconcat([frame, img])
            ret, buffer = cv2.imencode('.jpg', output_frame)
            if not ret:
                continue
            frame_bytes = buffer.tobytes()

            try:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            except GeneratorExit:
                break

            if cv2.waitKey(10) & 0xFF == ord('x'):
                break

    cap.release()
    cv2.destroyAllWindows()
    print("🛑 手語辨識系統已停止")