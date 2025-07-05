# 手語/語音辨識系統 (Sign Language/Speech Recognition System)

一個為銀行服務設計的即時手語和語音辨識系統，支援聾人與銀行員工之間的無障礙溝通。

## 功能特色

- **即時手語辨識**: 使用 MediaPipe 進行手部追蹤，結合機器學習模型進行手語識別
- **語音辨識**: 基於 Whisper 模型的語音轉文字功能
- **雙向溝通**: 支援聾人客戶與銀行員工的即時對話
- **訊息編輯**: 允許修改和重新錄製辨識結果
- **使用者回饋**: 完整的服務評價系統

## 技術架構

### 前端 (Frontend)
- **React 18**: 主要 UI 框架
- **MediaPipe**: 手部關節點檢測
- **WebRTC**: 影像和音訊串流
- **React Router**: 路由管理

### 後端 (Backend)
- **Node.js + Express**: API 伺服器
- **MongoDB**: 資料儲存
- **Python Flask**: 機器學習模型服務
- **Whisper**: 語音辨識模型

## 系統需求

- Node.js 16+
- Python 3.8+
- MongoDB 4.4+
- 攝影機和麥克風權限
- 現代瀏覽器 (Chrome, Firefox, Safari)

## 安裝與設定

### 1. clone 專案
```bash
git clone <repository-url>
cd 永豐產學
cd App
```

### 2. 前端設定
```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm start
```
前端將在 `http://localhost:3000` 運行

### 3. 後端設定
```bash
# 進入後端目錄
cd server

# 啟動伺服器
node server.js
```
後端 API 將在 `http://localhost:8080` 運行

### 4. MongoDB 設定
```bash
# 啟動 MongoDB
mongosh
```

### 5. Python 機器學習服務
```bash
# 建立虛擬環境 (建議使用 conda)
conda create -n tf215_env python=3.8
conda activate tf215_env

# 安裝 OpenAI Whisper
pip install git+https://github.com/openai/whisper.git

# 安裝其他依賴
pip install -r requirements.txt

# 啟動 Flask 應用
python app.py
```

## 使用說明

### 系統流程
1. **歡迎頁面**: 點擊螢幕開始服務
2. **對話頁面**: 主要溝通介面
3. **手語辨識**: 即時手語轉文字
4. **語音辨識**: 語音轉文字
5. **回饋頁面**: 服務評價
6. **感謝頁面**: 自動返回待機

### 操作指南

#### 手語辨識
1. 點擊「手語辨識」按鈕
2. 允許攝影機權限
3. 將手部置於攝影機前
4. 系統將即時顯示辨識結果
5. 點擊停止按鈕結束辨識

#### 語音辨識
1. 點擊「語音辨識」按鈕
2. 允許麥克風權限
3. 開始說話
4. 系統將顯示轉錄結果
5. 點擊停止按鈕結束錄音

#### 訊息編輯
- 點擊訊息旁的編輯按鈕可修改內容
- 點擊重新錄製按鈕可重新進行辨識

## API 端點

### 手語辨識
- `POST /api/sign-language-recognition/frame`
  - 接收手部關節點資料
  - 返回辨識結果

### 語音辨識
- `POST /api/speech-recognition`
  - 接收音訊檔案
  - 返回語音轉文字結果

### 回饋系統
- `POST /api/feedback`
  - 接收使用者評價
  - 儲存至資料庫

## 聯絡資訊

如有任何問題或建議，請聯絡開發團隊。
