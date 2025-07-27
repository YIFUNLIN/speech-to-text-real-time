# Speech-to-Text App

即時語音轉文字應用程式，使用 OpenAI Whisper 模型

## 功能特點

- 即時語音錄製和轉換
- 支援多種音訊格式
- 使用 OpenAI Whisper API 進行高精度語音識別
- 現代化的 React 前端界面
- 高效能的 FastAPI 後端

## 技術架構

- **前端**: React + TypeScript + Vite
- **後端**: FastAPI + Python
- **語音識別**: OpenAI Whisper API
- **音訊處理**: Web Audio API

## 專案結構

```
speech-to-text-app/
├── frontend/          # React 前端應用
├── backend/           # FastAPI 後端服務
├── docker-compose.yml # Docker 容器編排
└── README.md         # 專案說明
```

## 快速開始

### 環境要求

- Node.js 18+
- Python 3.8+
- OpenAI API Key

### 安裝步驟

1. 克隆專案
```bash
git clone https://github.com/your-username/speech-to-text-app.git
cd speech-to-text-app
```

2. 設定環境變數
```bash
cp backend/.env.example backend/.env
# 編輯 backend/.env 並添加您的 OpenAI API Key
```

3. 啟動後端服務
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

4. 啟動前端應用
```bash
cd frontend
npm install
npm run dev
```

5. 訪問應用程式
- 前端: http://localhost:5173
- 後端 API 文檔: http://localhost:8000/docs

## API 文檔

詳細的 API 文檔可在後端啟動後訪問: http://localhost:8000/docs

## 授權

MIT License
