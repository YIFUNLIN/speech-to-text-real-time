import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface MindMapBranch {
  name: string;
  keywords: string[];
  sub_branches?: {
    name: string;
    keywords: string[];
  }[];
}

export interface MindMapData {
  central_topic: string;
  branches: MindMapBranch[];
}

export interface TranscriptionResult {
  success: boolean;
  text: string;
  original_text?: string;
  language?: string;
  duration?: number;
  segments?: any[];
  timestamp?: string;
  mindmap?: MindMapData;
}

export interface ApiError {
  detail: string;
}

class SpeechToTextAPI {
  private axiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async transcribeAudio(audioFile: File): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append('file', audioFile);

      const response = await this.axiosInstance.post<TranscriptionResult>(
        '/transcribe',
        formData
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const apiError = error.response.data as ApiError;
        throw new Error(apiError.detail || '轉錄失敗');
      }
      throw new Error('網路連接錯誤，請檢查後端服務是否正在運行');
    }
  }

  async transcribeRealtimeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], 'audio.webm', {
        type: 'audio/webm',
      });
      formData.append('file', audioFile);

      const response = await this.axiosInstance.post<TranscriptionResult>(
        '/transcribe-realtime',
        formData
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const apiError = error.response.data as ApiError;
        throw new Error(apiError.detail || '即時轉錄失敗');
      }
      throw new Error('網路連接錯誤，請檢查後端服務是否正在運行');
    }
  }

  async healthCheck(): Promise<{ status: string; service: string }> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('無法連接到後端服務');
    }
  }
}

export const speechToTextAPI = new SpeechToTextAPI();
