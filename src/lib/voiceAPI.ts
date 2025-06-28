export interface VoiceTranscriptionResult {
  text: string;
  confidence?: number;
  error?: string;
}

class VoiceAPIService {
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Permission error:', err);
      return false;
    }
  }

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];

    this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Not recording'));
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder!.mimeType });
        this.isRecording = false;
        this.mediaRecorder!.stream.getTracks().forEach(t => t.stop());
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  async transcribe(audioBlob: Blob): Promise<VoiceTranscriptionResult> {
    try {
      const base64 = await this.blobToBase64(audioBlob);

      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64
        })
      });

      const data = await response.json();
      return {
        text: data.response || '',
        confidence: 1.0
      };
    } catch (err: any) {
      return { text: '', error: err.message };
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

export const voiceAPI = VoiceAPIService.getInstance(); 