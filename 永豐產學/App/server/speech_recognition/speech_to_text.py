import whisper
import opencc
import sounddevice as sd
import numpy as np
import tempfile
import os
from scipy.io import wavfile
import re
import difflib

class AudioTranscriber:
    def __init__(self, dictionary_file="sign_language_dic.txt"):
        # 初始化繁體轉換器
        self.converter = opencc.OpenCC('s2t')  # 簡體轉繁體
        # 載入whisper模型
        print("正在載入模型...")
        self.model = whisper.load_model("small")
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
        with open(file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue  # 略過空行
                if "->" not in line:
                    continue  # 略過格式不正確的行
                key, value = line.split("->", 1)
                dictionary[key.strip()] = value.strip()
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
            print(f"轉錄時發生錯誤: {str(e)}")
            return None

    def cleanup(self, temp_file):
        """清理臨時文件"""
        try:
            os.unlink(temp_file)
        except Exception as e:
            print(f"清理臨時文件時發生錯誤: {str(e)}")

def main():
    transcriber = AudioTranscriber()  # 可在此指定字典檔案路徑，如 AudioTranscriber("my_dict.txt")
    
    while True:
        try:
            print("\n=== 語音轉文字系統 ===")
            print("1. 開始錄音（8秒）")
            print("2. 退出")
            choice = input("請選擇操作 (1/2): ")
            
            if choice == "1":
                # 錄音
                recording = transcriber.record_audio()
                # 保存音頻
                temp_file = transcriber.save_audio(recording)
                if temp_file is None:
                    continue
                # 轉錄
                print("正在轉錄...")
                result = transcriber.transcribe_audio(temp_file)
                # 顯示結果
                if result:
                    print("\n轉錄結果:")
                    print(result["繁體"])
                    print("\n手語轉錄結果:")
                    print(result["手語"])
                # 清理臨時檔案
                transcriber.cleanup(temp_file)
                
            elif choice == "2":
                print("感謝使用！")
                break
            else:
                print("無效的選擇，請重試。")
                
        except KeyboardInterrupt:
            print("\n程式已被使用者中斷")
            break
        except Exception as e:
            print(f"發生錯誤: {str(e)}")

if __name__ == "__main__":
    main()
