from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import openai
import os
from dotenv import load_dotenv
import tempfile
import aiofiles
from typing import Dict, Any, List
import logging
import re
import json

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
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],  # React 開發伺服器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 OpenAI 客戶端
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY 環境變數未設定")

client = openai.OpenAI(api_key=openai_api_key)

def convert_to_traditional_chinese(text: str) -> str:
    """
    使用 OpenAI API 將簡體中文轉換為繁體中文
    """
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system", 
                    "content": "你是一個語言轉換專家。請將用戶輸入的文字轉換為繁體中文，保持原意不變，只改變字體。如果輸入已經是繁體中文，則直接返回原文。請只返回轉換後的文字內容，不要包含任何解釋或提示。"
                },
                {
                    "role": "user", 
                    "content": text
                }
            ],
            max_tokens=1000,
            temperature=0.1
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.warning(f"繁體中文轉換失敗，返回原文: {e}")
        return text

def generate_mindmap_data(text: str) -> Dict[str, Any]:
    """
    生成內容架構圖（使用 Mermaid 流程圖格式）
    """
    try:
        # 分析文本結構
        sentences = [s.strip() for s in text.split('。') if s.strip() and len(s.strip()) > 3]
        
        if not sentences:
            # 如果沒有句號分隔，嘗試用逗號分隔
            sentences = [s.strip() for s in text.split(',') if s.strip() and len(s.strip()) > 3]
        
        if not sentences:
            # 如果還是沒有，就用整段文字
            sentences = [text.strip()]
        
        # 創建架構流程圖
        diagram_content = "graph TD\n"
        diagram_content += "    A[語音轉錄內容] --> B[主要內容]\n"
        
        # 添加內容節點
        for i, sentence in enumerate(sentences[:4]):  # 最多4個節點避免過度擁擠
            node_id = chr(67 + i)  # C, D, E, F
            # 優化節點文字長度和換行
            if len(sentence) > 15:
                # 尋找適當的斷點
                words = sentence.split()
                if len(words) > 2:
                    mid = len(words) // 2
                    line1 = ' '.join(words[:mid])
                    line2 = ' '.join(words[mid:])
                    if len(line1) > 20:
                        line1 = line1[:17] + "..."
                    if len(line2) > 20:
                        line2 = line2[:17] + "..."
                    node_text = f"{line1}<br/>{line2}"
                else:
                    node_text = sentence[:25] + "..." if len(sentence) > 25 else sentence
            else:
                node_text = sentence
            
            # 清理特殊字符避免 Mermaid 語法錯誤
            node_text = node_text.replace('"', '&quot;').replace("'", "&#39;").replace('\n', '<br/>')
            diagram_content += f"    B --> {node_id}[\"{node_text}\"]\n"
        
        # 添加改進的樣式
        diagram_content += "\n"
        diagram_content += "    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px,font-size:14px;\n"
        diagram_content += "    classDef highlight fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,font-weight:bold;\n"
        diagram_content += "    classDef content fill:#fff3e0,stroke:#f57c00,stroke-width:2px;\n"
        diagram_content += "    class A highlight;\n"
        diagram_content += "    class B content;\n"
        
        return {
            "type": "mermaid",
            "mermaid_code": diagram_content
        }
        
    except Exception as e:
        logger.warning(f"架構圖生成失敗: {e}")
        # 最基本的架構圖
        clean_text = text[:20].replace('"', '&quot;').replace("'", "&#39;").replace('\n', '<br/>')
        return {
            "type": "mermaid",
            "mermaid_code": f"graph TD\n    A[語音轉錄] --> B[\"{clean_text}...\"]\n    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px,font-size:14px;\n    classDef highlight fill:#e3f2fd,stroke:#1976d2,stroke-width:3px;\n    class A highlight;"
        }

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
                    response_format="verbose_json",
                    language="zh"  # 指定中文語言
                )
            
            # 直接使用原始轉譯結果，不強制轉換
            transcribed_text = transcript.text
            
            # 生成心智圖數據（可選，不影響主要轉譯）
            mindmap_data = None
            try:
                if len(transcribed_text.strip()) > 20:  # 只有足夠長的文字才生成心智圖
                    mindmap_data = generate_mindmap_data(transcribed_text)
            except Exception as e:
                logger.warning(f"心智圖生成失敗，但不影響轉譯: {e}")
            
            result = {
                "success": True,
                "text": transcribed_text,
                "language": transcript.language,
                "duration": transcript.duration,
                "segments": transcript.segments if hasattr(transcript, 'segments') else [],
                "mindmap": mindmap_data
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
                    response_format="text",
                    language="zh"  # 指定中文語言
                )
            
            # 直接使用原始轉譯結果，確保精確度
            transcribed_text = transcript.strip()
            
            # 生成心智圖數據（可選，不影響主要轉譯）
            mindmap_data = None
            try:
                if len(transcribed_text) > 20:  # 只有足夠長的文字才生成心智圖
                    mindmap_data = generate_mindmap_data(transcribed_text)
            except Exception as e:
                logger.warning(f"心智圖生成失敗，但不影響轉譯: {e}")
            
            result = {
                "success": True,
                "text": transcribed_text,
                "timestamp": "realtime",
                "mindmap": mindmap_data
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
