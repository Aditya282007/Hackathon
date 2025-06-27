import React, { useState } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { voiceAPI, VoiceTranscriptionResult } from '../lib/voiceAPI';

const FloatingChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-16 h-16 bg-primary-500 text-white rounded-full shadow-2xl hover:bg-primary-600 transition-all duration-300 z-40 ${
          isOpen ? 'scale-0' : 'scale-100 glow-pulse'
        }`}
      >
        <MessageCircle className="h-8 w-8 mx-auto" />
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 fade-in"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chat Container */}
          <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-2xl neobrutalist-shadow z-50 slide-up max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-primary-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-700">Health Assistant</h3>
                  <p className="text-xs text-primary-600">Ask me about your symptoms</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-primary-600" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="h-[calc(100%-4rem)] overflow-hidden">
              <MiniTriageChat />
            </div>
          </div>
        </>
      )}
    </>
  );
};

const MiniTriageChat: React.FC = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hi! I'm your AI health assistant. How can I help you today?",
      sender: 'bot' as const,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [hasVoicePermission, setHasVoicePermission] = useState(false);

  // Initialize voice API
  React.useEffect(() => {
    const initVoice = async () => {
      const hasPermission = await voiceAPI.requestMicrophonePermission();
      setHasVoicePermission(hasPermission);
    };
    initVoice();
  }, []);

  const quickQuestions = [
    "I have a headache",
    "Feeling dizzy",
    "Chest pain",
    "Need medication help"
  ];

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    // Stop listening if currently active
    if (isListening) {
      stopListening();
    }

    const userMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user' as const,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);
    setSpeechError(null);

    // Simulate AI response
    setTimeout(() => {
      const botResponse = {
        id: (Date.now() + 1).toString(),
        text: generateQuickResponse(text),
        sender: 'bot' as const,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateQuickResponse = (input: string): string => {
    const responses = [
      "I understand your concern. Can you tell me when this started?",
      "That sounds important. Have you experienced this before?",
      "Let me help you with that. Can you describe it in more detail?",
      "I'd recommend discussing this with a healthcare provider. Would you like me to help you schedule an appointment?",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const startListening = async () => {
    if (isListening) {
      await stopListening();
      return;
    }

    if (!hasVoicePermission) {
      const hasPermission = await voiceAPI.requestMicrophonePermission();
      if (!hasPermission) {
        setSpeechError('Microphone access denied. Please allow microphone access and try again.');
        return;
      }
      setHasVoicePermission(true);
    }

    try {
      setSpeechError(null);
      setIsListening(true);
      await voiceAPI.startRecording();
    } catch (error: any) {
      console.error('Voice recording error:', error);
      setIsListening(false);
      setSpeechError('Failed to start voice recording. Please try again.');
    }
  };

  const stopListening = async () => {
    if (!isListening) return;

    try {
      setSpeechError('Processing audio...');
      const audioBlob = await voiceAPI.stopRecording();
      
      setSpeechError('Transcribing...');
      const result: VoiceTranscriptionResult = await voiceAPI.transcribe(audioBlob);
      
      if (result.error) {
        setSpeechError(result.error);
      } else if (result.text) {
        setInputText(result.text);
        setSpeechError(null);
      } else {
        setSpeechError('No speech detected. Please try again.');
      }
    } catch (error: any) {
      console.error('Voice processing error:', error);
      setSpeechError('Failed to process voice input. Please try again.');
    } finally {
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              message.sender === 'user'
                ? 'bg-primary-500 text-white'
                : 'bg-primary-100 text-primary-700'
            }`}>
              {message.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-primary-100 rounded-2xl px-3 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-primary-100">
          <p className="text-xs text-primary-600 mb-2">Quick questions:</p>
          <div className="space-y-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(question)}
                className="w-full text-left px-3 py-2 text-sm bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Speech Error Display */}
      {speechError && (
        <div className="px-4 pb-2">
          <div className={`flex items-center space-x-2 p-2 rounded-lg ${
            speechError.includes('Processing') || speechError.includes('Transcribing')
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <AlertCircle className={`h-4 w-4 flex-shrink-0 ${
              speechError.includes('Processing') || speechError.includes('Transcribing')
                ? 'text-blue-500'
                : 'text-red-500'
            }`} />
            <p className={`text-xs ${
              speechError.includes('Processing') || speechError.includes('Transcribing')
                ? 'text-blue-700'
                : 'text-red-700'
            }`}>
              {speechError}
            </p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-primary-100">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
              placeholder="Type or speak your message..."
              className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:border-primary-500 focus:outline-none pr-10"
            />
            <button
              onClick={startListening}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${
                isListening ? 'text-red-500 animate-pulse' : 'text-primary-500 hover:text-primary-600'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => handleSendMessage(inputText)}
            disabled={!inputText.trim()}
            className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        
        {isListening && (
          <div className="flex items-center justify-center mt-2">
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
              <p className="text-xs font-medium">🎤 Recording...</p>
              <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingChatWidget;