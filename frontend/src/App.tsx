import React, { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, Upload, Download, Trash2, Brain, Settings } from 'lucide-react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { speechToTextAPI, TranscriptionResult } from './api';
import AudioVisualizer from './components/AudioVisualizer';
import MindMap from './components/MindMap';

interface TranscriptionItem extends TranscriptionResult {
  id: string;
  timestamp: string;
  fileName?: string;
  showMindMap?: boolean;
}

function App() {
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-1.5-flash');
  const [showModelSelector, setShowModelSelector] = useState(false);

  // 檢查後端連接狀態
  const checkConnection = useCallback(async () => {
    try {
      await speechToTextAPI.healthCheck();
      setIsConnected(true);
      setError(null);
      
      // 獲取可用模型列表
      try {
        const modelResponse = await speechToTextAPI.getAvailableModels();
        setAvailableModels(modelResponse.models);
      } catch (modelError) {
        console.warn('無法獲取模型列表:', modelError);
      }
    } catch (err) {
      setIsConnected(false);
      setError('無法連接到後端服務，請確保後端服務正在運行');
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000); // 每30秒檢查一次連接
    return () => clearInterval(interval);
  }, [checkConnection]);

  // 音訊錄製完成處理
  const handleRecordingComplete = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await speechToTextAPI.transcribeRealtimeAudio(audioBlob);
      
      if (result.success && result.text.trim()) {
        const newTranscription: TranscriptionItem = {
          ...result,
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('zh-TW'),
          fileName: '即時錄音',
        };
        
        setTranscriptions(prev => [newTranscription, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '轉錄失敗');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 錄製錯誤處理
  const handleRecordingError = useCallback((errorMessage: string) => {
    setError(`錄音錯誤: ${errorMessage}`);
  }, []);

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    audioLevel,
  } = useAudioRecorder({
    onRecordingComplete: handleRecordingComplete,
    onError: handleRecordingError,
  });

  // 檔案上傳處理
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await speechToTextAPI.transcribeAudio(file);
      
      if (result.success) {
        const newTranscription: TranscriptionItem = {
          ...result,
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('zh-TW'),
          fileName: file.name,
        };
        
        setTranscriptions(prev => [newTranscription, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '檔案轉錄失敗');
    } finally {
      setIsProcessing(false);
      event.target.value = ''; // 重置檔案輸入
    }
  }, []);

  // 切換架構圖顯示
  const toggleMindMap = useCallback((id: string) => {
    setTranscriptions(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, showMindMap: !item.showMindMap }
          : item
      )
    );
  }, []);

  // 重新生成架構圖
  const regenerateMindMap = useCallback(async (id: string) => {
    const transcription = transcriptions.find(t => t.id === id);
    if (!transcription) return;

    setIsProcessing(true);
    try {
      const result = await speechToTextAPI.generateMindmap(transcription.text, selectedModel);
      if (result.success) {
        setTranscriptions(prev =>
          prev.map(item =>
            item.id === id
              ? { ...item, mindmap: result.mindmap }
              : item
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '架構圖生成失敗');
    } finally {
      setIsProcessing(false);
    }
  }, [transcriptions, selectedModel]);

  // 刪除轉錄記錄
  const handleDeleteTranscription = useCallback((id: string) => {
    setTranscriptions(prev => prev.filter(item => item.id !== id));
  }, []);

  // 下載轉錄文本
  const handleDownloadText = useCallback((text: string, fileName: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_轉錄.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // 格式化錄音時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 獲取狀態文本
  const getStatusText = () => {
    if (!isConnected) return '服務未連接';
    if (isProcessing) return '正在處理...';
    if (isRecording) return `正在錄音 ${formatTime(recordingTime)}`;
    return '準備就緒';
  };

  // 獲取狀態樣式
  const getStatusClass = () => {
    if (!isConnected) return 'status error';
    if (isProcessing) return 'status processing';
    if (isRecording) return 'status recording';
    return 'status idle';
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🎤 語音轉文字工具</h1>
        <p>使用 OpenAI Whisper 模型進行高精度語音識別</p>
      </div>

      {/* 連接狀態與錯誤顯示 */}
      {error && (
        <div className="error">
          ⚠️ {error}
          {!isConnected && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
              請確保後端服務正在 http://localhost:8000 運行
            </div>
          )}
        </div>
      )}

      {/* 狀態顯示 */}
      <div className={getStatusClass()}>
        {getStatusText()}
      </div>

      {/* Gemini 模型選擇器 */}
      {isConnected && availableModels.length > 0 && (
        <div className="model-selector">
          <label htmlFor="model-select">
            <Brain className="inline-icon" />
            架構圖生成模型:
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="model-select"
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 錄音控制區域 */}
      <div className="recording-section">
        <button
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isConnected || isProcessing}
          title={isRecording ? '停止錄音' : '開始錄音'}
        >
          {isRecording ? <MicOff /> : <Mic />}
        </button>

        {/* 音訊視覺化 */}
        <AudioVisualizer audioLevel={audioLevel} isActive={isRecording} />

        {/* 處理中指示器 */}
        {isProcessing && (
          <div style={{ margin: '1rem 0' }}>
            <div className="loading"></div>
            <p style={{ marginTop: '0.5rem' }}>正在轉錄音訊...</p>
          </div>
        )}
      </div>

      {/* 檔案上傳區域 */}
      <div className="file-upload">
        <input
          type="file"
          id="audio-upload"
          accept="audio/*"
          onChange={handleFileUpload}
          disabled={!isConnected || isProcessing}
        />
        <label htmlFor="audio-upload" className="file-upload-label">
          <Upload size={20} />
          選擇音訊檔案上傳 (支援 MP3, WAV, M4A 等格式)
        </label>
      </div>

      {/* 轉錄結果顯示 */}
      {transcriptions.length > 0 && (
        <div className="results">
          <h2>轉錄結果</h2>
          {transcriptions.map((item) => (
            <div key={item.id} className="result-item">
              <div className="result-timestamp">
                📅 {item.timestamp}
                {item.fileName && ` • 📁 ${item.fileName}`}
                {item.language && ` • 🌐 ${item.language.toUpperCase()}`}
                {item.duration && ` • ⏱️ ${Math.round(item.duration)}秒`}
                
                <div style={{ float: 'right', display: 'flex', gap: '0.5rem' }}>
                  {item.mindmap && (
                    <button
                      onClick={() => toggleMindMap(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#7c3aed',
                        padding: '0.25rem',
                      }}
                      title={item.showMindMap ? '隱藏架構圖' : '顯示架構圖'}
                    >
                      <Brain size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => regenerateMindMap(item.id)}
                    disabled={isProcessing}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      color: isProcessing ? '#999' : '#10b981',
                      padding: '0.25rem',
                    }}
                    title={`使用 ${selectedModel} 重新生成架構圖`}
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => handleDownloadText(item.text, item.fileName || 'transcription')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#667eea',
                      padding: '0.25rem',
                    }}
                    title="下載文本"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteTranscription(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc3545',
                      padding: '0.25rem',
                    }}
                    title="刪除記錄"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="result-text">
                {item.text}
              </div>
              
              {/* 架構圖顯示 */}
              {item.showMindMap && item.mindmap && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Brain size={18} />
                    內容架構圖
                  </h4>
                  <MindMap data={item.mindmap} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 使用說明 */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.9rem', color: '#666' }}>
        <h3 style={{ marginBottom: '0.5rem', color: '#333' }}>使用說明：</h3>
        <ul style={{ textAlign: 'left', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
          <li>點擊麥克風按鈕開始即時錄音，再次點擊停止錄音並自動轉錄</li>
          <li>或者上傳現有的音訊檔案進行轉錄</li>
          <li>支援多種語言的自動識別</li>
          <li>轉錄結果可以下載為文本檔案</li>
          <li>確保麥克風權限已開啟以使用錄音功能</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
