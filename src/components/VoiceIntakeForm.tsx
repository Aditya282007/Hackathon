import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, User, Calendar, Phone, MapPin, AlertCircle, Pill, Heart, Volume2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { voiceAPI, VoiceTranscriptionResult } from '../lib/voiceAPI';

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  chiefComplaint: string;
  allergies: string;
  medications: string;
  medicalHistory: string;
}

interface VoiceRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  hasPermission: boolean;
  error: string;
  transcript: string;
}

export function VoiceIntakeForm() {
  const { user, profile } = useAuth();
  const [currentField, setCurrentField] = useState<keyof FormData | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceRecognitionState>({
    isSupported: true, // Always supported with external APIs
    isListening: false,
    hasPermission: false,
    error: '',
    transcript: '',
  });
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    address: '',
    chiefComplaint: '',
    allergies: '',
    medications: '',
    medicalHistory: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const [preferredVoiceService, setPreferredVoiceService] = useState<'openai' | 'gemini'>('openai');
  
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-fill form with profile data
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        dateOfBirth: profile.date_of_birth || '',
        phone: profile.phone || '',
        address: profile.address || '',
      }));
    }
  }, [profile]);

  // Initialize voice API
  useEffect(() => {
    const initializeVoiceAPI = async () => {
      try {
        const hasPermission = await voiceAPI.requestMicrophonePermission();
        setVoiceState(prev => ({
          ...prev,
          hasPermission,
          error: hasPermission ? '' : 'Microphone access denied. Please allow microphone access to use voice input.'
        }));
      } catch (error) {
        console.error('Voice API initialization error:', error);
        setVoiceState(prev => ({
          ...prev,
          hasPermission: false,
          error: 'Failed to initialize voice input. Please check your microphone and browser permissions.'
        }));
      }
    };

    initializeVoiceAPI();

    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, []);

  const startListening = async (field: keyof FormData) => {
    if (voiceState.isListening && currentField === field) {
      await stopListening();
      return;
    }

    if (voiceState.isListening && currentField !== field) {
      await stopListening();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!voiceState.hasPermission) {
      const hasPermission = await voiceAPI.requestMicrophonePermission();
      if (!hasPermission) {
        setVoiceState(prev => ({
          ...prev,
          error: 'Microphone access denied. Please allow microphone access and try again.'
        }));
        return;
      }
      setVoiceState(prev => ({ ...prev, hasPermission: true, error: '' }));
    }

    try {
      setCurrentField(field);
      setVoiceState(prev => ({
        ...prev,
        isListening: true,
        error: '',
        transcript: ''
      }));

      await voiceAPI.startRecording();

      // Auto-stop recording after 30 seconds
      recordingTimeoutRef.current = setTimeout(async () => {
        if (voiceState.isListening) {
          await stopListening();
        }
      }, 30000);

    } catch (error: any) {
      console.error('Error starting voice recording:', error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        error: error.message || 'Failed to start voice recording. Please try again.'
      }));
      setCurrentField(null);
    }
  };

  const stopListening = async () => {
    if (!voiceState.isListening || !currentField) {
      return;
    }

    try {
      setVoiceState(prev => ({
        ...prev,
        error: 'Processing audio...'
      }));

      const audioBlob = await voiceAPI.stopRecording();
      
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        error: 'Transcribing audio...'
      }));

      const result: VoiceTranscriptionResult = await voiceAPI.transcribe(audioBlob, preferredVoiceService);
      
      if (result.error) {
        setVoiceState(prev => ({
          ...prev,
          error: result.error || 'Failed to transcribe audio'
        }));
      } else if (result.text) {
        // Add transcribed text to the current field
        setFormData(prev => {
          const currentValue = prev[currentField!];
          const newValue = currentValue + (currentValue ? ' ' : '') + result.text.trim();
          return {
            ...prev,
            [currentField!]: newValue
          };
        });

        setVoiceState(prev => ({
          ...prev,
          transcript: result.text,
          error: `✓ Transcribed successfully${result.confidence ? ` (${Math.round(result.confidence * 100)}% confidence)` : ''}`
        }));

        // Clear success message after 3 seconds
        setTimeout(() => {
          setVoiceState(prev => ({ ...prev, error: '' }));
        }, 3000);
      } else {
        setVoiceState(prev => ({
          ...prev,
          error: 'No speech detected. Please try speaking more clearly.'
        }));
      }

    } catch (error: any) {
      console.error('Error stopping voice recording:', error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        error: error.message || 'Failed to process voice recording'
      }));
    } finally {
      setCurrentField(null);
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearField = (field: keyof FormData) => {
    setFormData(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const speakFieldLabel = (label: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(`Please provide your ${label.toLowerCase()}`);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const testMicrophone = async () => {
    setVoiceState(prev => ({ ...prev, error: 'Testing microphone...' }));
    
    const hasPermission = await voiceAPI.requestMicrophonePermission();
    
    if (hasPermission) {
      setVoiceState(prev => ({ 
        ...prev, 
        error: '✓ Microphone test successful! You can now use voice input.',
        hasPermission: true 
      }));
      
      setTimeout(() => {
        setVoiceState(prev => ({ ...prev, error: '' }));
      }, 3000);
    } else {
      setVoiceState(prev => ({
        ...prev,
        error: 'Microphone test failed. Please check your microphone and browser permissions.'
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setSubmitMessage('Please sign in to submit the form.');
      return;
    }

    // Stop any ongoing voice recording
    if (voiceState.isListening) {
      await stopListening();
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Update profile with basic information
      const profileUpdates = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth || null,
        phone: formData.phone,
        address: formData.address,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      // Submit intake form data
      const intakeData = {
        patient_id: user.id,
        chief_complaint: formData.chiefComplaint,
        allergies: formData.allergies,
        medications: formData.medications,
        medical_history: formData.medicalHistory,
        form_data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          phone: formData.phone,
          address: formData.address,
          submittedAt: new Date().toISOString(),
        },
      };

      const { error: intakeError } = await supabase
        .from('patient_intake_forms')
        .insert(intakeData);

      if (intakeError) {
        throw intakeError;
      }

      setSubmitMessage('Intake form submitted successfully!');
      
      // Reset medical fields but keep personal info
      setFormData(prev => ({
        ...prev,
        chiefComplaint: '',
        allergies: '',
        medications: '',
        medicalHistory: '',
      }));

    } catch (error: any) {
      console.error('Error submitting intake form:', error);
      setSubmitMessage(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const FormField = ({ 
    field, 
    label, 
    icon: Icon, 
    placeholder, 
    type = 'text',
    rows 
  }: {
    field: keyof FormData;
    label: string;
    icon: React.ComponentType<any>;
    placeholder: string;
    type?: string;
    rows?: number;
  }) => {
    const isListeningToThisField = voiceState.isListening && currentField === field;
    const hasContent = formData[field].length > 0;
    
    return (
      <div className="space-y-2">
        <label className="flex items-center text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 mr-2" />
          {label}
          {isListeningToThisField && (
            <span className="ml-2 text-xs text-red-600 animate-pulse">🎤 Recording...</span>
          )}
        </label>
        
        <div className="relative">
          {rows ? (
            <textarea
              rows={rows}
              value={formData[field]}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={placeholder}
              className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all ${
                isListeningToThisField 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
            />
          ) : (
            <input
              type={type}
              value={formData[field]}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={placeholder}
              className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                isListeningToThisField 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300'
              }`}
            />
          )}
          
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
            {hasContent && (
              <button
                type="button"
                onClick={() => clearField(field)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Clear field"
              >
                <AlertCircle className="w-4 h-4" />
              </button>
            )}
            
            <button
              type="button"
              onClick={() => speakFieldLabel(label)}
              className="p-1 text-blue-500 hover:text-blue-700 rounded"
              title="Hear field description"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              onClick={() => startListening(field)}
              disabled={!voiceState.hasPermission}
              className={`p-1 rounded transition-all ${
                isListeningToThisField
                  ? 'bg-red-100 text-red-600 animate-pulse shadow-lg'
                  : voiceState.hasPermission
                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={
                !voiceState.hasPermission 
                  ? 'Voice input not available' 
                  : isListeningToThisField 
                  ? 'Stop recording' 
                  : 'Start voice input'
              }
            >
              {isListeningToThisField ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        
        {isListeningToThisField && (
          <div className="flex items-center justify-between text-xs">
            <p className="text-green-600 animate-pulse">
              🎤 Recording... Speak clearly. Will auto-stop after 30 seconds.
            </p>
            <button
              type="button"
              onClick={stopListening}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Patient Intake Form</h1>
          <p className="text-blue-100">
            Complete your medical information. Use AI-powered voice input with the microphone icon.
          </p>
        </div>

        {/* Voice Status and Help */}
        {voiceState.error && (
          <div className={`border-l-4 p-4 m-6 ${
            voiceState.error.includes('✓') 
              ? 'bg-green-50 border-green-400' 
              : voiceState.error.includes('Processing') || voiceState.error.includes('Transcribing')
              ? 'bg-blue-50 border-blue-400'
              : 'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-start">
              <AlertCircle className={`h-5 w-5 mr-2 mt-0.5 flex-shrink-0 ${
                voiceState.error.includes('✓') 
                  ? 'text-green-400' 
                  : voiceState.error.includes('Processing') || voiceState.error.includes('Transcribing')
                  ? 'text-blue-400'
                  : 'text-red-400'
              }`} />
              <div className="flex-1">
                <p className={
                  voiceState.error.includes('✓') 
                    ? 'text-green-700' 
                    : voiceState.error.includes('Processing') || voiceState.error.includes('Transcribing')
                    ? 'text-blue-700'
                    : 'text-red-700'
                }>
                  {voiceState.error}
                </p>
                {!voiceState.hasPermission && !voiceState.error.includes('✓') && !voiceState.error.includes('Processing') && (
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={testMicrophone}
                      className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      Test Microphone
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {voiceState.hasPermission && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 m-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-green-400 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-700">
                  AI-powered voice input is ready! Click the microphone icon next to any field to start recording.
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  <label className="text-sm text-green-600">
                    Voice Service:
                    <select
                      value={preferredVoiceService}
                      onChange={(e) => setPreferredVoiceService(e.target.value as 'openai' | 'gemini')}
                      className="ml-2 text-sm border border-green-300 rounded px-2 py-1"
                    >
                      <option value="openai">OpenAI Whisper</option>
                      <option value="gemini">Google Gemini</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              field="firstName"
              label="First Name"
              icon={User}
              placeholder="Enter your first name"
            />
            <FormField
              field="lastName"
              label="Last Name"
              icon={User}
              placeholder="Enter your last name"
            />
            <FormField
              field="dateOfBirth"
              label="Date of Birth"
              icon={Calendar}
              placeholder="YYYY-MM-DD"
              type="date"
            />
            <FormField
              field="phone"
              label="Phone Number"
              icon={Phone}
              placeholder="Enter your phone number"
              type="tel"
            />
          </div>

          <FormField
            field="address"
            label="Address"
            icon={MapPin}
            placeholder="Enter your full address"
          />

          {/* Medical Information */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h3>
            <div className="space-y-6">
              <FormField
                field="chiefComplaint"
                label="Chief Complaint"
                icon={AlertCircle}
                placeholder="Describe your main concern or reason for visit"
                rows={3}
              />
              <FormField
                field="allergies"
                label="Allergies"
                icon={AlertCircle}
                placeholder="List any allergies (medications, food, environmental)"
                rows={2}
              />
              <FormField
                field="medications"
                label="Current Medications"
                icon={Pill}
                placeholder="List all current medications and dosages"
                rows={3}
              />
              <FormField
                field="medicalHistory"
                label="Medical History"
                icon={Heart}
                placeholder="Describe any past medical conditions, surgeries, or significant health events"
                rows={4}
              />
            </div>
          </div>

          {submitMessage && (
            <div className={`p-4 rounded-lg ${
              submitMessage.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {submitMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !user}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              'Submitting...'
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Intake Form
              </>
            )}
          </button>

          {!user && (
            <p className="text-center text-gray-600">
              Please sign in to submit your intake form.
            </p>
          )}

          {/* Voice Input Help */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-blue-900">AI Voice Input Guide</h4>
              <button
                type="button"
                onClick={() => setShowVoiceHelp(!showVoiceHelp)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showVoiceHelp ? 'Hide' : 'Show'} Help
              </button>
            </div>
            
            {showVoiceHelp && (
              <div className="text-sm text-blue-700 space-y-2">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium mb-1">Getting Started:</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Click "Test Microphone" first</li>
                      <li>• Allow microphone access when prompted</li>
                      <li>• Click the microphone icon next to any field</li>
                      <li>• Speak clearly and at normal pace</li>
                      <li>• Recording stops automatically after 30 seconds</li>
                      <li>• AI transcription happens in the cloud</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-1">AI Voice Features:</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Powered by OpenAI Whisper or Google Gemini</li>
                      <li>• High accuracy speech recognition</li>
                      <li>• Automatic punctuation and formatting</li>
                      <li>• Works in any environment</li>
                      <li>• No browser compatibility issues</li>
                      <li>• Confidence scores provided</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-3 p-2 bg-blue-100 rounded text-blue-800 text-xs">
                  <strong>API Configuration:</strong> To use voice input, you need to configure API keys:
                  <br />• Add VITE_OPENAI_API_KEY for OpenAI Whisper
                  <br />• Add VITE_GEMINI_API_KEY for Google Gemini
                  <br />The system will automatically fallback between services if one fails.
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}