#!/bin/bash

# 語音轉文字應用程式啟動腳本

echo "🚀 正在啟動語音轉文字應用程式..."

# 檢查是否有 .env 檔案
if [ ! -f "backend/.env" ]; then
    echo "⚠️  未找到 backend/.env 檔案"
    echo "📝 正在從範例檔案創建 .env..."
    cp backend/.env.example backend/.env
    echo "✅ 已創建 backend/.env 檔案"
    echo "🔑 請編輯 backend/.env 檔案並添加您的 OpenAI API Key"
    echo ""
fi

# 檢查 Docker 是否運行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker 未運行，請先啟動 Docker"
    exit 1
fi

# 啟動服務
echo "🐳 正在啟動 Docker 服務..."
docker-compose up --build

echo "🎉 應用程式已啟動!"
echo "🌐 前端: http://localhost:3000"
echo "🔧 後端 API: http://localhost:8000"
echo "📚 API 文檔: http://localhost:8000/docs"
