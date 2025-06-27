/* eslint-disable @typescript-eslint/no-explicit-any */
import { VOICE_API_CONFIG } from './supabase';

export interface VoiceTranscriptionResult {
  text: string;
  confidence?: number;
  error?: string;
}

export class VoiceAPIService {
  private static instance: VoiceAPIService;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;

  static getInstance(): VoiceAPIService {
    if (!VoiceAPIService.instance) {
      VoiceAPIService.instance = new VoiceAPIService();
    }
    return VoiceAPIService.instance;
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      });
      
      // Test if we can create MediaRecorder
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.warn('WebM audio not supported, falling back to default');
      }
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      });

      // Choose the best supported audio format
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Not currently recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder!.mimeType });
        this.isRecording = false;
        
        // Stop all tracks
        if (this.mediaRecorder?.stream) {
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event: any) => {
        reject(new Error(`Recording error: ${event.error}`));
      };

      this.mediaRecorder.stop();
    });
  }

  async transcribeWithOpenAI(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
    const apiKey = VOICE_API_CONFIG.openai.apiKey;
    
    if (!apiKey) {
      return {
        text: '',
        error: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.'
      };
    }

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await fetch(VOICE_API_CONFIG.openai.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return {
        text: data.text || '',
        confidence: 1.0, // OpenAI doesn't provide confidence scores
      };
    } catch (error: any) {
      console.error('OpenAI transcription error:', error);
      return {
        text: '',
        error: error.message || 'Failed to transcribe audio with OpenAI'
      };
    }
  }

  async transcribeWithGemini(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
    const apiKey = VOICE_API_CONFIG.gemini.apiKey;
    
    if (!apiKey) {
      return {
        text: '',
        error: 'Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.'
      };
    }

    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const requestBody = {
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: base64Audio,
        },
      };

      const response = await fetch(`${VOICE_API_CONFIG.gemini.endpoint}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        if (result.alternatives && result.alternatives.length > 0) {
          return {
            text: result.alternatives[0].transcript || '',
            confidence: result.alternatives[0].confidence || 0.5,
          };
        }
      }

      return {
        text: '',
        error: 'No transcription results from Gemini'
      };
    } catch (error: any) {
      console.error('Gemini transcription error:', error);
      return {
        text: '',
        error: error.message || 'Failed to transcribe audio with Gemini'
      };
    }
  }

  async transcribe(audioBlob: Blob, preferredService: 'openai' | 'gemini' = 'openai'): Promise<VoiceTranscriptionResult> {
    // Try preferred service first
    if (preferredService === 'openai') {
      const result = await this.transcribeWithOpenAI(audioBlob);
      if (!result.error) {
        return result;
      }
      
      // Fallback to Gemini
      console.log('OpenAI failed, trying Gemini...');
      return await this.transcribeWithGemini(audioBlob);
    } else {
      const result = await this.transcribeWithGemini(audioBlob);
      if (!result.error) {
        return result;
      }
      
      // Fallback to OpenAI
      console.log('Gemini failed, trying OpenAI...');
      return await this.transcribeWithOpenAI(audioBlob);
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

export const voiceAPI = VoiceAPIService.getInstance();