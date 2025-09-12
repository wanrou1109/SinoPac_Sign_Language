import os
import sys
import jieba
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from docx import Document
import faiss
import numpy as np
from typing import Dict, List, Tuple
import re
from zhconv import convert
from langdetect import detect
from deep_translator import GoogleTranslator
from dotenv import load_dotenv


# === 🔑 設定 OpenRouter (OpenAI) API Key 與參數 ===
# === 🔑 載入環境變數 ===
load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")
base_url = "https://openrouter.ai/api/v1"
client = OpenAI(api_key=api_key, base_url=base_url)

# === 載入並拆分劇本語料 ===
def load_corpus_from_docx(file_path: str, max_len: int = 80) -> List[str]:
    doc = Document(file_path)
    chunks: List[str] = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        words = list(jieba.cut(text))
        cur: List[str] = []
        for w in words:
            cur.append(w)
            if len("".join(cur)) >= max_len:
                chunks.append("".join(cur))
                cur = []
        if cur:
            chunks.append("".join(cur))
    return chunks

corpus = load_corpus_from_docx("rag_nlToSign.docx", max_len=80)

# === 建立向量索引 ===
embedder = SentenceTransformer("shibing624/text2vec-base-chinese")
corpus_embeddings = embedder.encode(corpus, convert_to_numpy=True)
dimension = corpus_embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(corpus_embeddings)

# === 檢索最相關句子 ===
def retrieve_relevant_sentences(query: str, k: int = 5) -> List[str]:
    q_emb = embedder.encode([query], convert_to_numpy=True)
    _, indices = index.search(q_emb, k)
    return [corpus[i] for i in indices[0]]

# === 確保繁體中文輸出 ===
def ensure_traditional_chinese(text: str) -> Tuple[str, List[Dict[str,str]]]:
    translator = GoogleTranslator(source='auto', target='zh-TW')
    records: List[Dict[str,str]] = []
    words = text.split()
    result: List[str] = []
    for word in words:
        # 使用原始字符串 (r'...') 來正確處理正則表達式轉義序列
        if not re.match(r'^[\u4e00-\u9fff\s，。、]+$', word):
            lang = detect(word)
            if lang not in ('zh-tw','zh-cn'):
                trans = translator.translate(word)
                records.append({'original': word, 'translated': trans, 'detected_lang': lang})
                word = trans
        word = convert(word, 'zh-hant')
        result.append(word)
    return ' '.join(result), records
# === 轉手語主流程 ===
def translate_sentence(user_message: str) -> str:
    related = retrieve_relevant_sentences(user_message)
    context = "\n".join(f"- {s}" for s in related)
    system_prompt = f"""
你是一位專業的手語翻譯專家，請將「自然語序的中文句子」轉換成「手語語序」。
你**只能**使用**繁體中文**（模仿手語分詞），**絕對不要**輸出完整的句子標點或多餘說明。
**請注意：**  
1. ✏️ 只輸出「手語語序」格式詞串，用空格或斷行分隔詞素。  
2. 🎭 如果輸入與劇本例句相似，請盡量套用相同語序結構。  
3. ✅ 假設你是要翻譯給聽障銀行客戶看的，請完整翻譯客戶的內容。

**範例對照：**
- 自然中文：歡迎光臨本行  
  手語語序：歡迎 人來 銀行  
- 自然中文：請問您要辦理什麼服務?  
  手語語序：請問 蓋章蓋章 什麼  
- 自然中文：請問您要開戶的原因是?  
  手語語序：你 申請 存摺 用用 什麼
- 自然中文：請問您要使用實體存摺還是為您申請網路銀行呢?
  手語語序：請問 第一 存摺 拿走 第二 網路銀行 手機 滑 二選一 哪

**參考語料:**  
{context}
---
請將下列自然語序中文句子，轉換為手語語序：
"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_message}
    ]
    resp = client.chat.completions.create(
        model="qwen/qwen2.5-vl-72b-instruct:free",
        messages=messages
    )
    bot_reply = resp.choices[0].message.content.strip()
    converted, notes = ensure_traditional_chinese(bot_reply)
    if notes:
        note_txt = "\n註：已轉為繁體：\n" + "\n".join(f"- {n['original']}→{n['translated']}" for n in notes)
        converted += note_txt
    return converted

# === CLI 介面 ===
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python translate_to_sign.py \"中文句子\"")
        sys.exit(1)
    user_text = sys.argv[1]
    result = translate_sentence(user_text)
    print(result)