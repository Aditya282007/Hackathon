/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { voiceAPI } from '../lib/voiceAPI';

const VoiceIntakeForm = () => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    const permission = await voiceAPI.requestMicrophonePermission();
    if (!permission) {
      setError('Microphone access denied');
      return;
    }
    setError(null);
    await voiceAPI.startRecording();
    setIsRecording(true);
  };

  const handleStop = async () => {
    try {
      const blob = await voiceAPI.stopRecording();
      const result = await voiceAPI.transcribe(blob);
      if (result.error) setError(result.error);
      else setTranscript(result.text);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Voice Intake Form</h1>
      <div className="mb-4">
        <button
          className={`px-4 py-2 rounded text-white ${isRecording ? 'bg-red-500' : 'bg-blue-500'}`}
          onClick={isRecording ? handleStop : handleStart}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      {error && <div className="text-red-600 mb-2">Error: {error}</div>}
      <textarea
        className="w-full border p-2 rounded"
        rows={6}
        placeholder="Transcript will appear here..."
        value={transcript}
        readOnly
      />
    </div>
  );
};

export default VoiceIntakeForm;