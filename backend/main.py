from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import openai
import os
from dotenv import load_dotenv
import tempfile
import aiofiles
from typing import Dict, Any
import logging

# 載入環境變數
load_dotenv()

# 設定日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化 FastAPI 應用
app = FastAPI(
    title="Speech-to-Text API",
    description="即時語音轉文字 API 服務",
    version="1.0.0"
)

# 設定 CORS 中間件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React 開發伺服器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 OpenAI 客戶端
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY 環境變數未設定")

client = openai.OpenAI(api_key=openai_api_key)

@app.get("/")
async def root():
    """根路徑健康檢查"""
    return {"message": "Speech-to-Text API 正在運行", "status": "healthy"}

@app.get("/health")
async def health_check():
    """健康檢查端點"""
    return {"status": "healthy", "service": "speech-to-text-api"}

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    語音轉文字端點
    
    Args:
        file: 上傳的音訊檔案 (支援 mp3, mp4, mpeg, mpga, m4a, wav, webm)
        
    Returns:
        Dict containing transcribed text and metadata
    """
    try:
        # 檢查檔案類型
        allowed_types = [
            "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm",
            "audio/m4a", "audio/mpga", "audio/x-wav"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"不支援的檔案類型: {file.content_type}. 支援的類型: {', '.join(allowed_types)}"
            )
        
        # 檢查檔案大小 (25MB 限制)
        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="檔案大小超過 25MB 限制"
            )
        
        # 創建臨時檔案
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # 使用 OpenAI Whisper API 進行語音轉文字
            with open(temp_file_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json"
                )
            
            result = {
                "success": True,
                "text": transcript.text,
                "language": transcript.language,
                "duration": transcript.duration,
                "segments": transcript.segments if hasattr(transcript, 'segments') else []
            }
            
            logger.info(f"成功轉錄音訊檔案: {file.filename}")
            return result
            
        finally:
            # 清理臨時檔案
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except openai.APIError as e:
        logger.error(f"OpenAI API 錯誤: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"語音識別服務錯誤: {str(e)}"
        )
    except Exception as e:
        logger.error(f"轉錄過程中發生錯誤: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"內部伺服器錯誤: {str(e)}"
        )

@app.post("/transcribe-realtime")
async def transcribe_realtime_audio(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    即時語音轉文字端點 (適用於較短的音訊片段)
    
    Args:
        file: 上傳的音訊檔案片段
        
    Returns:
        Dict containing transcribed text
    """
    try:
        # 檢查檔案大小 (限制為 5MB 以確保即時性能)
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="即時轉錄檔案大小限制為 5MB"
            )
        
        # 創建臨時檔案
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # 使用 OpenAI Whisper API 進行語音轉文字
            with open(temp_file_path, "rb") as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
            
            result = {
                "success": True,
                "text": transcript.strip(),
                "timestamp": "realtime"
            }
            
            return result
            
        finally:
            # 清理臨時檔案
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"即時轉錄過程中發生錯誤: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"即時轉錄錯誤: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
