import fitz  # PyMuPDF
from flask import Flask, request, send_file,Response, make_response, jsonify
from werkzeug.utils import secure_filename
import os
from flask_cors import CORS
from flask_cors import cross_origin
import numpy as np  # 引入 NumPy 模組
from PIL import Image
import io
from Train_Model_hands2 import start
import threading


app = Flask(__name__)
CORS(app, supports_credentials=True)
outputFrame = None
lock = threading.Lock()
trans_res = None
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
@cross_origin(origins='http://localhost:3000', supports_credentials=True)
def favicon():
    return '', 204

@app.route('/handlanRes', methods=['POST'])
def handle_result():
    if request.method == 'POST':
        data = request.form
        result = data.get('result')
        global trans_res
        trans_res = result
        print('Received result:', result)
        return jsonify({"status": "ok"})  # ✅ 避免 500 error




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
@cross_origin(origins='http://localhost:3000', supports_credentials=True)
def video_feed():
    try:
        def generate():
            for frame in start():
                yield frame

        return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')
    except Exception as e:
        print(f"Video stream error: {e}")
        error_response = make_response("Video stream error", 500)
        return error_response
    
@app.route('/getRes', methods=['GET'])
def getRes():
    global trans_res
    msg = trans_res if trans_res else ""
    trans_res = None  # ✅ 讀取後清空（這樣前端會先拿到，不會搶輸句子清除）
    response = jsonify({"msg": msg})
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response


if __name__ == '__main__':
    app.config['UPLOAD_FOLDER'] = 'uploads'
    app.run(host='0.0.0.0', port=5050)
