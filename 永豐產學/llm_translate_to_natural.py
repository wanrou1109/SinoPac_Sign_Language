import os
import re
import jieba
import faiss
import numpy as np
from docx import Document
from zhconv import convert
from langdetect import detect
from typing import Dict, List, Tuple
from dotenv import load_dotenv
from deep_translator import GoogleTranslator
from sentence_transformers import SentenceTransformer
from openai import OpenAI

# === 🔐 載入 API 金鑰與模型設定 ===
load_dotenv(dotenv_path="App/.env")
api_key = os.getenv("OPENROUTER_API_KEY")
base_url = "https://openrouter.ai/api/v1"
client = OpenAI(api_key=api_key, base_url=base_url)

# === 載入語料庫並建立 FAISS 向量索引 ===
corpus_path = "rag_sentence.docx"
embedder = SentenceTransformer("shibing624/text2vec-base-chinese")

def load_corpus_from_docx(file_path, max_len=80) -> List[str]:
    doc = Document(file_path)
    chunks = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        words = list(jieba.cut(text))
        cur = []
        for w in words:
            cur.append(w)
            if len("".join(cur)) >= max_len:
                chunks.append("".join(cur))
                cur = []
        if cur:
            chunks.append("".join(cur))
    return chunks

corpus = load_corpus_from_docx(corpus_path)
corpus_embeddings = embedder.encode(corpus, convert_to_numpy=True)
dimension = corpus_embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(corpus_embeddings)

def retrieve_relevant_sentences(query: str, k=5) -> List[str]:
    q_emb = embedder.encode([query], convert_to_numpy=True)
    D, I = index.search(q_emb, k)
    # 只保留相似度高於門檻的句子
    threshold = 0.6
    filtered = [corpus[i] for d, i in zip(D[0], I[0]) if d < threshold]
    if not filtered:
        filtered = [query]

    return filtered


def ensure_traditional_chinese(text: str) -> Tuple[str, List[Dict[str, str]]]:
    translator = GoogleTranslator(source='auto', target='zh-TW')
    records = []
    words = text.split()
    result = []
    for word in words:
        try:
            if not re.match('^[\u4e00-\u9fff\s，。！？、]+$', word):
                lang = detect(word)
                if lang not in ('zh-tw', 'zh-cn'):
                    trans = translator.translate(word)
                    records.append({'original': word, 'translated': trans, 'detected_lang': lang})
                    word = trans
            word = convert(word, 'zh-hant')
        except Exception:
            pass
        result.append(word)
    return ' '.join(result), records

# === 供外部使用的主函數 ===
def translate_to_natural(user_message: str) -> str:
    # ✅ 對短句不檢索，直接翻譯
    if len(user_message.strip().split()) <= 1:
        related = []
    else:
        related = retrieve_relevant_sentences(user_message, k=5)

    context = "\n".join(f"- {s}" for s in related)

    system_prompt = f"""
你是一位專業的手語翻譯專家，請將「手語語序」轉換成自然的中文語句，並模仿銀行行員的口吻。
你**只能**使用**繁體中文**及中文標點作答，**絕對不要**摻任何英文字母、拼音或其他語種符號。
**請注意：**
1. 只輸出自然語序的中文句子，**不要**加入任何多餘說明文字。
2. 如果輸入與劇本例句相似，請盡量套用相同句型。
3. 假設你是銀行行員，用禮貌、清晰的客服語氣回答。

**範例對照：**
- 手語：我 申請 存摺  
  轉譯：我想要辦理開戶。
- 手語：存錢 用用 想 申請 存摺 封面名稱 各式 
  轉譯：我要用於存款，想開綜合存款帳戶。
- 手語：紙 簽名 完了
  轉譯： 我已經在上面簽名了。 



**劇本語料（參考）：**
{context}

---
請將下列手語語序，轉換為自然的中文句子：  
{user_message}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]

    resp = client.chat.completions.create(
        model="qwen/qwen2.5-vl-72b-instruct",
        messages=messages
    )
    bot_reply = resp.choices[0].message.content.strip()
    converted_reply, _ = ensure_traditional_chinese(bot_reply)
    return converted_reply

llm_translate_to_natural = translate_to_natural