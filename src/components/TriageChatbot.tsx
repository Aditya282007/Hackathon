import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Bot, User, Loader, AlertCircle, Volume2 } from 'lucide-react';
import { voiceAPI, VoiceTranscriptionResult } from '../lib/voiceAPI';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function TriageChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI health assistant. I can help you understand your symptoms and provide general health guidance. Please describe how you're feeling today, or click the microphone to speak.",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [hasVoicePermission, setHasVoicePermission] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize voice API
  useEffect(() => {
    const initVoice = async () => {
      const hasPermission = await voiceAPI.requestMicrophonePermission();
      setHasVoicePermission(hasPermission);
      if (!hasPermission) {
        setSpeechError('Microphone access denied. Please allow microphone access to use voice input.');
      }
    };
    initVoice();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      setSpeechError('');
      setIsListening(true);
      await voiceAPI.startRecording();
    } catch (error: any) {
      console.error('Voice recording error:', error);
      setIsListening(false);
      setSpeechError(error.message || 'Failed to start voice recording');
    }
  };

  const stopListening = async () => {
    if (!isListening) return;

    try {
      setSpeechError('Processing audio...');
      const audioBlob = await voiceAPI.stopRecording();
      
      setSpeechError('Transcribing audio...');
      const result: VoiceTranscriptionResult = await voiceAPI.transcribe(audioBlob);
      
      if (result.error) {
        setSpeechError(result.error);
        setTimeout(() => setSpeechError(''), 5000);
      } else if (result.text) {
        setInputText(result.text);
        setSpeechError('');
      } else {
        setSpeechError('No speech detected. Please try speaking more clearly.');
        setTimeout(() => setSpeechError(''), 5000);
      }
    } catch (error: any) {
      console.error('Voice processing error:', error);
      setSpeechError('Failed to process voice input. Please try again.');
      setTimeout(() => setSpeechError(''), 5000);
    } finally {
      setIsListening(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Microsoft') ||
        voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('headache') || lowerMessage.includes('head pain')) {
      return "I understand you're experiencing headaches. Headaches can have various causes including stress, dehydration, lack of sleep, or tension. Here are some general suggestions:\n\n• Stay hydrated by drinking plenty of water\n• Get adequate rest\n• Try relaxation techniques\n• Apply a cold or warm compress\n\nIf headaches are severe, frequent, or accompanied by other symptoms like fever, vision changes, or neck stiffness, please consult a healthcare provider immediately.";
    }
    
    if (lowerMessage.includes('fever') || lowerMessage.includes('temperature')) {
      return "Fever can be a sign that your body is fighting an infection. Here's what you should know:\n\n• Monitor your temperature regularly\n• Stay hydrated with water, clear broths, or electrolyte solutions\n• Rest and avoid strenuous activities\n• Consider over-the-counter fever reducers if appropriate\n\nSeek immediate medical attention if:\n• Fever is above 103°F (39.4°C)\n• You have difficulty breathing\n• Severe headache or neck stiffness\n• Persistent vomiting\n• Signs of dehydration";
    }
    
    if (lowerMessage.includes('cough') || lowerMessage.includes('throat')) {
      return "Coughs and sore throats are common symptoms that can be caused by various factors:\n\n• Viral infections (most common)\n• Bacterial infections\n• Allergies\n• Dry air or irritants\n\nGeneral care tips:\n• Stay hydrated\n• Use a humidifier or breathe steam\n• Gargle with warm salt water\n• Avoid smoking and irritants\n\nConsult a healthcare provider if you experience:\n• Difficulty breathing or swallowing\n• High fever\n• Blood in cough or saliva\n• Symptoms lasting more than 10 days";
    }
    
    if (lowerMessage.includes('stomach') || lowerMessage.includes('nausea') || lowerMessage.includes('vomit')) {
      return "Stomach issues can be uncomfortable. Here are some general guidelines:\n\n• Start with clear liquids (water, clear broths)\n• Try the BRAT diet (bananas, rice, applesauce, toast)\n• Avoid dairy, fatty, or spicy foods temporarily\n• Rest and avoid solid foods until nausea subsides\n\nSeek medical attention if you have:\n• Severe dehydration\n• Blood in vomit or stool\n• Severe abdominal pain\n• High fever\n• Signs of severe dehydration";
    }
    
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('911')) {
      return "🚨 If this is a medical emergency, please call 911 or go to your nearest emergency room immediately.\n\nSigns of medical emergencies include:\n• Difficulty breathing\n• Chest pain\n• Severe bleeding\n• Loss of consciousness\n• Severe allergic reactions\n• Signs of stroke or heart attack\n\nDon't wait - seek immediate professional medical help for any life-threatening situation.";
    }
    
    return "Thank you for sharing your symptoms with me. While I can provide general health information, I recommend consulting with a healthcare professional for a proper evaluation of your specific situation.\n\nIn the meantime:\n• Monitor your symptoms\n• Stay hydrated\n• Get adequate rest\n• Take note of any changes\n\nIs there anything specific about your symptoms you'd like to discuss further?";
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    if (isListening) {
      await stopListening();
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const aiResponse = await generateAIResponse(inputText);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I'm having trouble processing your request right now. Please try again or consult with a healthcare professional for immediate assistance.",
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-[700px] flex flex-col">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6">
          <h1 className="text-2xl font-bold text-white mb-2">AI Health Assistant</h1>
          <p className="text-green-100">
            Describe your symptoms and get general health guidance. Use AI-powered voice input or type your message.
          </p>
          <p className="text-xs text-green-200 mt-2">
            ⚠️ Not a replacement for professional medical advice
          </p>
        </div>

        {speechError && (
          <div className={`border-l-4 p-4 m-4 rounded ${
            speechError.includes('Processing') || speechError.includes('Transcribing')
              ? 'bg-blue-50 border-blue-400'
              : 'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-start">
              <AlertCircle className={`w-5 h-5 mt-0.5 mr-2 flex-shrink-0 ${
                speechError.includes('Processing') || speechError.includes('Transcribing')
                  ? 'text-blue-400'
                  : 'text-red-400'
              }`} />
              <div>
                <p className={`text-sm ${
                  speechError.includes('Processing') || speechError.includes('Transcribing')
                    ? 'text-blue-700'
                    : 'text-red-700'
                }`}>
                  {speechError}
                </p>
                {!hasVoicePermission && !speechError.includes('Processing') && (
                  <p className="text-xs text-red-600 mt-1">
                    To enable voice input: Allow microphone access when prompted by your browser.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.sender === 'bot' && (
                    <Bot className="w-5 h-5 mt-1 text-green-600 flex-shrink-0" />
                  )}
                  {message.sender === 'user' && (
                    <User className="w-5 h-5 mt-1 text-blue-200 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-line leading-relaxed">{message.text}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs ${
                        message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                      {message.sender === 'bot' && (
                        <button
                          onClick={() => speakText(message.text)}
                          className="text-gray-500 hover:text-gray-700 ml-2"
                          title="Read aloud"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl p-4 max-w-[85%]">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-green-600" />
                  <Loader className="w-4 h-4 animate-spin text-gray-600" />
                  <span className="text-gray-600">Analyzing your symptoms...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-gray-50 p-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe your symptoms or click the microphone to speak..."
                className="w-full px-4 py-3 pr-16 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white shadow-sm"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={startListening}
                disabled={isLoading}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-100 text-red-600 animate-pulse shadow-lg'
                    : hasVoicePermission
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-sm'
                    : 'bg-gray-100 text-gray-400'
                } disabled:opacity-50`}
                title={
                  isListening 
                    ? 'Stop recording' 
                    : !hasVoicePermission
                    ? 'Microphone access needed'
                    : 'Start AI voice input'
                }
              >
                {isListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {isListening && (
            <div className="flex items-center justify-center mt-3">
              <div className="flex items-center space-x-2 text-red-600">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce"></div>
                <p className="text-sm font-medium">🎤 Recording with AI transcription...</p>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              💡 Tip: Press Enter to send, Shift+Enter for new line
            </p>
            {hasVoicePermission && (
              <p className="text-xs text-blue-600">
                🎤 AI-powered voice input ready
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}