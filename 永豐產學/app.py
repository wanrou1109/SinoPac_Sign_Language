import fitz  # PyMuPDF
from flask import Flask, request, send_file,Response, make_response, jsonify
from werkzeug.utils import secure_filename
import os
import sys
from flask_cors import CORS
from flask_cors import cross_origin
import numpy as np  # 引入 NumPy 模組
from PIL import Image
import io
from Train_Model_hands2 import start
import threading
from llm_translate_to_natural import translate_to_natural  # 或你的實際路徑

# 讓 Flask 找得到 speech_recognition 模組
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, 'App', 'server', 'speech_recognition'))

from translate_to_sign import translate_sentence  # 直接匯入你的主函式


app = Flask(__name__)
CORS(app, origins="http://localhost:3000", supports_credentials=True)
outputFrame = None
lock = threading.Lock()
trans_res = None
staff_sign_seq = None  # 專門存語音→手語語序（staff 的）
natural_language_result = None

def process_pdf(input_path, output_path, type, level):
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
def favicon():
    return '', 204

@app.route('/handlanRes', methods=['POST', 'GET'])
def handle_result():
    global trans_res
    
    if request.method == 'POST':
        data = request.form
        result = data.get('result')
        trans_res = result
        print('Received result:', result)
        return jsonify({"status": "ok"}) 
    
    elif request.method == 'GET':
        msg = trans_res if trans_res else ""
        trans_res = None 
        print(f"返回手語語序: {msg}")
        return jsonify({"msg": msg})
    
# === 新增：專用 API，避免與 /handlanRes 衝突 ===
@app.route('/signseq/staff', methods=['POST', 'GET'])
def handle_staff_signseq():
    global staff_sign_seq

    if request.method == 'POST':
        # 允許 x-www-form-urlencoded 或 JSON 兩種格式
        result = request.form.get('result')
        if result is None:
            data = request.get_json(silent=True) or {}
            result = data.get('result')

        staff_sign_seq = result or ""
        print('Received STAFF sign sequence:', staff_sign_seq)

        resp = jsonify({"status": "ok"})
        return resp

    elif request.method == 'GET':
        msg = staff_sign_seq or ""
        staff_sign_seq = None  # 讀一次即清空，避免重播
        print(f"Return STAFF sign sequence: {msg}")

        resp = jsonify({"msg": msg})
        return resp



# LLM 轉換結果
@app.route('/naturalRes', methods=['POST'])
def handle_natural_res():
    if request.method == 'POST':
        data = request.form
        result = data.get('result')
        global natural_language_result
        natural_language_result = result  # 存儲LLM轉換後的中文結果
        print('LLM轉換後的中文結果:', result)
        response = jsonify({"status": "ok"})
        response.headers.add('Access-Control-Allow-Credentials')
        return response
    
@app.route('/translateSign', methods=['POST'])
def translate_sign():
    # 從前端取出傳過來的手語句子，如果沒帶就用 last_sign_sentence
    data = request.get_json(silent=True) or {}

    # 2) 優先用前端傳 signSentence；若沒傳再用上次存的 trans_res
    sign_sentence = data.get('signSentence')
    sentence = sign_sentence if sign_sentence else trans_res

    # 3) 若還是拿不到，就回 400 或直接空字串
    if not sentence:
        return jsonify({'msg': ''}), 400

    # 呼叫你的 LLM 翻譯函式
    try:
        natural = translate_to_natural(sentence)
    except Exception as e:
        print("LLM 翻譯失敗：", e)
        return jsonify({'msg': ''}), 500

    # 回傳給前端 { msg: "翻譯結果" }
    response = jsonify({'msg': natural})
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

@app.route('/api/translate-sign', methods=['POST'])
def api_translate_sign():
    """
    輸入: JSON    { "text": "自然語序中文" }
        或 x-www-form-urlencoded: text=...
    回傳: JSON    { "success": true, "signLanguage": "手語語序 字串" }
    """
    try:
        data = request.get_json(silent=True) or {}
        text = data.get('text') or request.form.get('text') or ''
        text = (text or '').strip()
        if not text:
            return jsonify({"success": False, "message": "text is required"}), 400

        sign_str = translate_sentence(text)  # 呼叫 translate_to_sign.py 的函式
        return jsonify({"success": True, "signLanguage": (sign_str or "").strip()})
    except Exception as e:
        print("translate-sign error:", repr(e))
        return jsonify({"success": False, "message": "translate failed"}), 500



@app.route('/process_pdf', methods=['POST'])
def process_pdf_route():
    file = request.files['file']
    type = request.form['type']
    level = request.form['level']

    filename = secure_filename(file.filename)
    input_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + filename)
    file.save(input_path)


    process_pdf(input_path, output_path, type, level)

    return send_file(output_path, mimetype='application/pdf')

from flask import make_response

@app.route('/video_feed')
def video_feed():
    try:
        # 直接將 start() 作為 Response 的資料來源
        response = Response(start(), mimetype='multipart/x-mixed-replace; boundary=frame')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    except Exception as e:
        print(f"Video stream error: {e}")
        error_response = make_response("Video stream error", 500)
        error_response.headers.add('Access-Control-Allow-Credentials', 'true')
        return error_response

if __name__ == '__main__':
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.run(host='0.0.0.0', port=5050)
