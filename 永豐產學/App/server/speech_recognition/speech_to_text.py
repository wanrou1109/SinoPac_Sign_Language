import whisper
import opencc
import sounddevice as sd
import numpy as np
import tempfile
import os
from scipy.io import wavfile
import re
import difflib
import sys
import json

class AudioTranscriber:
    def __init__(self, dictionary_file="sign_language_dic.txt"):
        # 初始化繁體轉換器
        self.converter = opencc.OpenCC('s2t')  # 簡體轉繁體
        # 載入whisper模型
        sys.stderr.write("正在載入模型...\n")  # 使用stderr而不是print
        self.model = whisper.load_model("tiny")
        # 錄音設定
        self.samplerate = 16000  # Whisper 要求16kHz
        self.channels = 1        # 單聲道

        # 從外部 txt 檔讀取手語對照字典
        self.SIGN_LANGUAGE_DICT = self.load_sign_language_dictionary(dictionary_file)

    def load_sign_language_dictionary(self, file_path):
        """從指定的 txt 檔讀取手語對照字典並回傳一個 dictionary"""
        dictionary = {}
        if not os.path.exists(file_path):
            print(f"字典檔案 {file_path} 不存在！請先建立此檔案。")
            return dictionary
        try:
            # 嘗試開啟並讀取檔案
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
                
            # 記錄檔案引入路徑
            sys.stderr.write(f"成功讀取字典檔案: {file_path}\n")
            
            # 解析檔案內容
            for line in lines:
                line = line.strip()
                if not line:
                    continue  # 略過空行
                if "->" not in line:
                    continue  # 略過格式不正確的行
                key, value = line.split("->", 1)
                dictionary[key.strip()] = value.strip()
            
        except Exception as e:
            sys.stderr.write(f"讀取字典檔案時發生錯誤: {str(e)}\n")
        
        return dictionary

    def record_audio(self, duration=8):
        """錄製指定時長的音頻"""
        print(f"開始錄音 {duration} 秒...")
        recording = sd.rec(
            int(duration * self.samplerate),
            samplerate=self.samplerate,
            channels=self.channels,
            dtype=np.int16
        )
        sd.wait()  # 等待錄音完成
        print("錄音完成！")
        return recording

    def save_audio(self, recording):
        """將錄音保存為臨時WAV文件"""
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        try:
            wavfile.write(temp_file.name, self.samplerate, recording)
            return temp_file.name
        except Exception as e:
            print(f"保存音頻時發生錯誤: {str(e)}")
            return None

    def to_sign_language(self, text):
        # 使用 difflib 模糊比對整句
        best_match = difflib.get_close_matches(text, self.SIGN_LANGUAGE_DICT.keys(), n=1, cutoff=0.5)
        if best_match:
            return self.SIGN_LANGUAGE_DICT[best_match[0]]
        else:
            return text  # 若未找到對應則保留原句

    def transcribe_audio(self, audio_file):
        """將音頻轉換為文字，並依據字典轉換為手語語序"""
        try:
            result = self.model.transcribe(audio_file, language="zh")
            simplified_text = result["text"]
            traditional_text = self.converter.convert(simplified_text)
            # 去除標點符號
            text_no_punct = re.sub(r'[^\w\s]', '', traditional_text)
            # 使用字典轉換為手語
            sign_language_text = self.to_sign_language(text_no_punct)
            return {
                "簡體": simplified_text,
                "繁體": traditional_text,
                "手語": sign_language_text
            }
        except Exception as e:
            # 不要使用print輸出錯誤，而是記錄到stderr
            sys.stderr.write(f"轉錄時發生錯誤: {str(e)}\n")
            return None

def main():
    try:
        # 獲取腳本所在的目錄
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 構建字典檔案的路徑
        dict_path = os.path.join(script_dir, 'sign_language_dic.txt')
        
        # 所有非JSON輸出都寫入stderr
        sys.stderr.write(f"使用字典檔案: {dict_path}\n")
        
        # 初始化轉錄器
        transcriber = AudioTranscriber(dict_path)
        
        # 檢查是否有命令行參數
        if len(sys.argv) > 1:
            audio_file_path = sys.argv[1]
            sys.stderr.write(f"處理音頻檔案: {audio_file_path}\n")
            
            # 轉錄
            result = transcriber.transcribe_audio(audio_file_path)
            
            # 輸出結果為JSON，包括失敗情況
            if result:
                # 只輸出一行JSON到stdout
                print(json.dumps({
                    "success": True,
                    "text": result["繁體"],
                    "signLanguage": result["手語"]
                }, ensure_ascii=False))
            else:
                # 轉錄失敗也輸出JSON
                print(json.dumps({
                    "success": False,
                    "error": "轉錄失敗"
                }, ensure_ascii=False))
        else:
            # 缺少參數時輸出JSON錯誤
            print(json.dumps({
                "success": False,
                "error": "未提供音頻檔案路徑"
            }, ensure_ascii=False))
    except Exception as e:
        # 捕獲所有可能的異常並輸出為JSON
        sys.stderr.write(f"處理過程中發生錯誤: {str(e)}\n")
        print(json.dumps({
            "success": False,
            "error": f"處理過程中發生錯誤: {str(e)}"
        }, ensure_ascii=False))

if __name__ == "__main__":
    main()
