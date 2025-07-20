#!/usr/bin/env python3
"""
基於原本 app.py 的修復版本
保持原有結構，但安全地處理 Train_Model_hands2.start() 以避免 segfault
"""

import sys
import os
import threading
import traceback
import numpy as np
from flask import Flask, request, send_file, Response, make_response, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS, cross_origin
from PIL import Image
import io

print(f"🐍 Python: {sys.executable}")

# 安全導入 PyMuPDF
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
    print("✅ PyMuPDF 載入成功")
except ImportError as e:
    print(f"❌ PyMuPDF 載入失敗: {e}")
    PYMUPDF_AVAILABLE = False

# 安全導入 Train_Model_hands2
HANDS_MODEL_AVAILABLE = False
start_function = None

try:
    print("🤖 嘗試載入 Train_Model_hands2...")
    from Train_Model_hands2 import start
    start_function = start
    HANDS_MODEL_AVAILABLE = True
    print("✅ Train_Model_hands2 載入成功")
except Exception as e:
    print(f"⚠️ Train_Model_hands2 載入失敗: {e}")
    print("   將使用備用視訊生成器")
    
    # 創建備用的 start 函數
    def create_fallback_start():
        import cv2
        import time
        
        def fallback_start():
            """備用的視訊生成器"""
            print("📹 使用備用視訊生成器...")
            
            try:
                # 嘗試使用攝像頭
                cap = cv2.VideoCapture(0)
                
                if not cap.isOpened():
                    print("⚠️ 攝像頭不可用，使用虛擬畫面")
                    cap = None
                else:
                    print("✅ 攝像頭開啟成功")
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                    cap.set(cv2.CAP_PROP_FPS, 15)
                
                frame_count = 0
                max_frames = 2000  # 限制最大幀數
                
                while frame_count < max_frames:
                    try:
                        if cap is not None:
                            ret, frame = cap.read()
                            if not ret:
                                print("攝像頭讀取失敗，切換到虛擬模式")
                                cap.release()
                                cap = None
                        
                        if cap is None:
                            # 生成虛擬畫面
                            frame = np.zeros((480, 640, 3), dtype=np.uint8)
                            colors = [(255, 100, 100), (100, 255, 100), (100, 100, 255)]  # BGR
                            frame[:, :] = colors[frame_count % 3]
                            
                            # 添加文字
                            cv2.putText(frame, f'Fallback Mode - Frame {frame_count}', (50, 100), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                            cv2.putText(frame, f'Time: {time.strftime("%H:%M:%S")}', (50, 150), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                            cv2.putText(frame, 'Model: Fallback (Safe Mode)', (50, 200), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                            cv2.putText(frame, 'No AI Processing', (50, 250), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        
                        # 水平翻轉（鏡像效果）
                        frame = cv2.flip(frame, 1)
                        
                        # 編碼為 JPEG
                        success, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                        
                        if not success:
                            print(f"❌ 第 {frame_count} 幀編碼失敗")
                            break
                        
                        frame_bytes = buffer.tobytes()
                        
                        yield (b'--frame\r\n'
                               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                        
                        frame_count += 1
                        time.sleep(0.067)  # ~15 FPS
                        
                        if frame_count % 100 == 0:
                            print(f"📊 備用模式已生成 {frame_count} 幀")
                    
                    except Exception as e:
                        print(f"❌ 幀生成錯誤: {e}")
                        time.sleep(0.1)
                        continue
                
                if cap is not None:
                    cap.release()
                
                print("✅ 備用視訊生成完成")
                
            except Exception as e:
                print(f"❌ 備用視訊生成嚴重錯誤: {e}")
                
                # 最後的備案：純文字回應
                error_msg = f"Fallback Video Error: {str(e)}"
                yield (b'--frame\r\n'
                       b'Content-Type: text/plain\r\n\r\n' + 
                       error_msg.encode() + b'\r\n')
        
        return fallback_start
    
    start_function = create_fallback_start()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"]) 
outputFrame = None
lock = threading.Lock()
trans_res = None

def process_pdf(input_path, output_path, type, level):
    """PDF 處理功能（原有邏輯）"""
    if not PYMUPDF_AVAILABLE:
        raise ImportError("PyMuPDF not available")
    
    # 打開PDF
    pdf_document = fitz.open(input_path)
    new_pdf = fitz.open()

    # 每一頁
    for page_num in range(len(pdf_document)):
        page = pdf_document.load_page(page_num)

        # 拿頁面的像素數據
        pix = page.get_pixmap()

        # 像素轉為PIL圖像
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # 圖像數據轉為Numpy
        img_array = np.array(img)

        if level == 's':
            factor = 1.15
        elif level == 'm':
            factor = 1.3
        else:
            factor = 1.5

        # 修改rgb值
        if type == 'r':
            img_array[..., 0] = np.minimum(255, img_array[..., 0] * factor)  # R channel
            img_array[..., 2] = np.minimum(255, img_array[..., 2] * factor)  # B channel
        elif type == 'g':
            img_array[..., 1] = np.minimum(255, img_array[..., 1] * factor) # G channel
            img_array[..., 2] = np.minimum(255, img_array[..., 2] * factor) # B channel
        else:
            img_array[..., 0] = np.minimum(255, img_array[..., 0] * factor) # R channel
            img_array[..., 1] = np.minimum(255, img_array[..., 1] * factor) # G channel

        # 修改後的轉回PIL
        img = Image.fromarray(img_array)

        # PIL轉回圖像加到新的pdf
        img_stream = io.BytesIO()
        img.save(img_stream, format='PDF')
        img_pdf = fitz.open("pdf", img_stream.getvalue())
        new_pdf.insert_pdf(img_pdf)

    # 保存修改後的PDF
    new_pdf.save(output_path)
    new_pdf.close()
    pdf_document.close()

@app.route('/favicon.ico')
@cross_origin(origins='http://localhost:3000', supports_credentials=True)
def favicon():
    return '', 204

@app.route('/api/test')
def test_api():
    """測試 API - 新增"""
    return jsonify({
        "message": "修復版後端運行中",
        "status": "ok",
        "python_path": sys.executable,
        "hands_model": "available" if HANDS_MODEL_AVAILABLE else "fallback",
        "pymupdf": "available" if PYMUPDF_AVAILABLE else "not_available",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S") if 'time' in globals() else "unknown"
    })

@app.route('/handlanRes', methods=['POST'])
def handle_result():
    """處理手語結果（原有邏輯）"""
    if request.method == 'POST':
        try:
            data = request.form
            result = data.get('result')
            global trans_res
            trans_res = result
            print('✅ 收到手語結果:', result)
            return jsonify({"status": "ok"})
        except Exception as e:
            print(f"❌ 處理結果錯誤: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/process_pdf', methods=['POST'])
def process_pdf_route():
    """PDF 處理路由（原有邏輯）"""
    if not PYMUPDF_AVAILABLE:
        return jsonify({"error": "PyMuPDF not available"}), 500
    
    try:
        file = request.files['file']
        type = request.form['type']
        level = request.form['level']

        filename = secure_filename(file.filename)
        input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + filename)
        file.save(input_path)

        process_pdf(input_path, output_path, type, level)
        return send_file(output_path, mimetype='application/pdf')
    except Exception as e:
        print(f"❌ PDF 處理錯誤: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/video_feed')
@cross_origin(origins='http://localhost:3000', supports_credentials=True)
def video_feed():
    """視訊串流（修復版本）"""
    print("📹 收到視訊串流請求")
    
    try:
        # 安全調用 start 函數（可能是原始的或備用的）
        if start_function:
            print(f"🎬 使用 {'原始' if HANDS_MODEL_AVAILABLE else '備用'} 視訊生成器")
            response = Response(start_function(), mimetype='multipart/x-mixed-replace; boundary=frame')
        else:
            # 最後的備案
            print("⚠️ 無可用的視訊生成器，返回錯誤")
            return jsonify({"error": "No video generator available"}), 500
        
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
        
    except Exception as e:
        print(f"❌ 視訊串流錯誤: {e}")
        print(f"錯誤詳情: {traceback.format_exc()}")
        error_response = make_response(f"Video stream error: {str(e)}", 500)
        error_response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        error_response.headers.add('Access-Control-Allow-Credentials', 'true')
        return error_response

@app.route('/getRes', methods=['GET'])
def getRes():
    """取得結果（原有邏輯）"""
    global trans_res
    msg = trans_res if trans_res else ""
    trans_res = None  # 讀取後清空
    response = jsonify({"msg": msg})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/naturalRes', methods=['POST'])
def handle_natural_res():
    """處理自然語言結果（原有邏輯）"""
    if request.method == 'POST':
        try:
            data = request.form
            result = data.get('result')
            print('✅ 收到自然語言結果:', result)
            response = jsonify({"status": "ok"})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response
        except Exception as e:
            print(f"❌ 處理自然語言結果錯誤: {e}")
            response = jsonify({"status": "error", "message": str(e)})
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
            response.headers.add('Access-Control-Allow-Credentials', 'true')
            return response, 500

# 錯誤處理
@app.errorhandler(500)
def internal_error(error):
    print(f"❌ 500錯誤: {error}")
    response = jsonify({'error': '內部伺服器錯誤', 'message': str(error)})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response, 500

@app.errorhandler(404)
def not_found(error):
    response = jsonify({'error': '找不到資源'})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response, 404

if __name__ == '__main__':
    # 創建上傳資料夾
    upload_folder = 'uploads'
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    app.config['UPLOAD_FOLDER'] = upload_folder
    
    print("\n" + "="*70)
    print("🚀 啟動修復版 Flask 伺服器（基於原始結構）")
    print("="*70)
    print(f"📍 測試 API: http://localhost:5050/api/test")
    print(f"📍 視訊串流: http://localhost:5050/video_feed")
    print(f"📍 手語結果: http://localhost:5050/handlanRes")
    print(f"📍 取得結果: http://localhost:5050/getRes")
    print(f"📍 自然語言: http://localhost:5050/naturalRes")
    print(f"📍 PDF 處理: http://localhost:5050/process_pdf")
    print(f"🐍 Python: {sys.executable}")
    print(f"🤖 手語模型: {'✅ 原始模型' if HANDS_MODEL_AVAILABLE else '⚠️ 備用模式'}")
    print(f"📄 PDF處理: {'✅ 可用' if PYMUPDF_AVAILABLE else '❌ 不可用'}")
    print("="*70)
    
    try:
        app.run(host='0.0.0.0', port=5050, debug=False, threaded=True)
    except KeyboardInterrupt:
        print("\n👋 伺服器正常關閉")
    except Exception as e:
        print(f"❌ 啟動失敗: {e}")
        print(f"錯誤詳情: {traceback.format_exc()}")
        sys.exit(1)