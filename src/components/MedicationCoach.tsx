import React, { useState, useEffect } from 'react';
import { Pill, Clock, Bell, Plus, CheckCircle, Mic, MicOff, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Medication, MedicationLog } from '../lib/supabase';

const MedicationCoach: React.FC = () => {
  const { user } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const [speechError, setSpeechError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newMedication, setNewMedication] = useState<Partial<Medication>>({
    name: '',
    dosage: '',
    frequency: '',
    times: [''],
    start_date: '',
    notes: '',
  });

  const adherenceStats = {
    thisWeek: 85,
    thisMonth: 82,
    streak: 4,
  };

  useEffect(() => {
    if (user) {
      fetchMedications();
      fetchMedicationLogs();
    }
  }, [user]);

  const fetchMedications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const fetchMedicationLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('medication_logs')
        .select('*')
        .eq('patient_id', user.id)
        .gte('scheduled_time', new Date().toISOString().split('T')[0])
        .order('scheduled_time');

      if (error) throw error;
      setMedicationLogs(data || []);
    } catch (error) {
      console.error('Error fetching medication logs:', error);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Enable continuous recognition
      recognition.interimResults = true; // Show interim results
      recognition.lang = 'en-US';

      // Request microphone permission first
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          recognition.onstart = () => {
            setIsListening(true);
            setSpeechError('');
          };
          
          recognition.onend = () => {
            setIsListening(false);
          };
          
          recognition.onresult = (event) => {
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              }
            }

            if (finalTranscript) {
              const updatedNote = voiceNote + (voiceNote ? ' ' : '') + finalTranscript.trim();
              setVoiceNote(updatedNote);
              setNewMedication(prev => ({ ...prev, notes: updatedNote }));
            }
          };

          recognition.onerror = (event: { error: any; }) => {
            console.error('Speech recognition error:', event.error);
            
            let errorMessage = '';
            switch (event.error) {
              case 'no-speech':
                errorMessage = 'No speech detected. Please try speaking closer to your microphone.';
                break;
              case 'audio-capture':
                errorMessage = 'Microphone not accessible. Please check your microphone permissions.';
                break;
              case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                break;
              case 'network':
                errorMessage = 'Network error occurred. Please check your internet connection.';
                break;
              default:
                errorMessage = `Speech recognition error: ${event.error}`;
            }
            
            setSpeechError(errorMessage);
            setIsListening(false);
            
            // Clear error after 5 seconds
            setTimeout(() => setSpeechError(''), 5000);
          };

          try {
            recognition.start();
          } catch (error) {
            console.error('Error starting speech recognition:', error);
            setSpeechError('Failed to start speech recognition. Please try again.');
            setIsListening(false);
          }
        })
        .catch((error) => {
          console.error('Microphone access denied:', error);
          setSpeechError('Microphone access is required for voice input. Please allow microphone access in your browser settings.');
        });
    } else {
      setSpeechError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  const addMedication = async () => {
    if (!user || !newMedication.name || !newMedication.dosage) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('medications')
        .insert({
          patient_id: user.id,
          name: newMedication.name,
          dosage: newMedication.dosage,
          frequency: newMedication.frequency || 'Once daily',
          times: newMedication.times?.filter(t => t) || ['08:00'],
          start_date: newMedication.start_date || new Date().toISOString().split('T')[0],
          notes: newMedication.notes,
        });

      if (error) throw error;

      await fetchMedications();
      setNewMedication({ name: '', dosage: '', frequency: '', times: [''], start_date: '', notes: '' });
      setVoiceNote('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding medication:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMedication = async (medicationId: string) => {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationId);

      if (error) throw error;
      await fetchMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
    }
  };

  const toggleMedicationLog = async (logId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'taken' ? 'scheduled' : 'taken';
    const takenAt = newStatus === 'taken' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('medication_logs')
        .update({ 
          status: newStatus,
          taken_at: takenAt
        })
        .eq('id', logId);

      if (error) throw error;
      await fetchMedicationLogs();
    } catch (error) {
      console.error('Error updating medication log:', error);
    }
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto fade-in text-center">
        <h1 className="text-3xl font-bold text-primary-700 mb-4">Medication Adherence Coach</h1>
        <p className="text-primary-600 mb-6">Please sign in to access medication tracking.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-700 mb-4">Medication Adherence Coach</h1>
        <p className="text-primary-600 mb-6">
          Track your medications with voice-powered reminders and intelligent coaching.
        </p>
      </div>

      {speechError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{speechError}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Today's Reminders & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Adherence Stats */}
          <div className="bg-white rounded-2xl p-6 neobrutalist-shadow">
            <h2 className="text-xl font-semibold text-primary-700 mb-4 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Adherence Stats
            </h2>
            <div className="space-y-4">
              <StatItem label="This Week" value={`${adherenceStats.thisWeek}%`} color="bg-green-500" />
              <StatItem label="This Month" value={`${adherenceStats.thisMonth}%`} color="bg-blue-500" />
              <StatItem label="Current Streak" value={`${adherenceStats.streak} days`} color="bg-orange-500" />
            </div>
          </div>

          {/* Today's Reminders */}
          <div className="bg-white rounded-2xl p-6 neobrutalist-shadow">
            <h2 className="text-xl font-semibold text-primary-700 mb-4 flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Today's Reminders
            </h2>
            <div className="space-y-3">
              {medicationLogs.slice(0, 5).map((log) => {
                const medication = medications.find(med => med.id === log.medication_id);
                return (
                  <ReminderCard
                    key={log.id}
                    log={log}
                    medicationName={medication?.name || 'Unknown'}
                    onToggle={toggleMedicationLog}
                  />
                );
              })}
              {medicationLogs.length === 0 && (
                <p className="text-primary-600 text-sm">No reminders for today</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Medications List */}
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-primary-700">Your Medications</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-primary-500 text-white px-4 py-2 rounded-xl neobrutalist-shadow hover:bg-primary-600 transition-all duration-200"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Medication
            </button>
          </div>

          {/* Add Medication Form */}
          {showAddForm && (
            <div className="bg-white rounded-2xl p-6 neobrutalist-shadow mb-6 slide-up">
              <h3 className="text-lg font-semibold text-primary-700 mb-4">Add New Medication</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-primary-700 mb-2">
                    Medication Name
                  </label>
                  <input
                    type="text"
                    value={newMedication.name || ''}
                    onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-primary-200 rounded-lg focus:border-primary-500 focus:outline-none"
                    placeholder="e.g., Lisinopril"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-primary-700 mb-2">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={newMedication.dosage || ''}
                    onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-primary-200 rounded-lg focus:border-primary-500 focus:outline-none"
                    placeholder="e.g., 10mg"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-primary-700 mb-2">
                    Frequency
                  </label>
                  <select
                    value={newMedication.frequency || ''}
                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-primary-200 rounded-lg focus:border-primary-500 focus:outline-none"
                  >
                    <option value="">Select frequency</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-primary-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newMedication.start_date || ''}
                    onChange={(e) => setNewMedication({ ...newMedication, start_date: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-primary-200 rounded-lg focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Voice Notes */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-primary-700 mb-2">
                  Notes (Voice or Text)
                </label>
                <div className="flex space-x-2">
                  <textarea
                    value={newMedication.notes || voiceNote}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewMedication({ ...newMedication, notes: value });
                      setVoiceNote(value);
                    }}
                    className="flex-1 px-3 py-2 border-2 border-primary-200 rounded-lg focus:border-primary-500 focus:outline-none h-20 resize-none"
                    placeholder="Add notes about this medication..."
                  />
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      isListening
                        ? 'bg-red-500 text-white glow-pulse'
                        : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                    }`}
                  >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
                {isListening && (
                  <p className="text-sm text-green-600 mt-2 animate-pulse">🎤 Listening... Speak clearly. Click the microphone to stop.</p>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={addMedication}
                  disabled={loading}
                  className="bg-primary-500 text-white px-6 py-2 rounded-xl neobrutalist-shadow hover:bg-primary-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Medication'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-xl neobrutalist-shadow hover:bg-gray-600 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Medications List */}
          <div className="space-y-4">
            {medications.map((medication, index) => (
              <MedicationCard
                key={medication.id}
                medication={medication}
                onDelete={deleteMedication}
                index={index}
              />
            ))}
            {medications.length === 0 && (
              <div className="bg-white rounded-2xl p-8 neobrutalist-shadow text-center">
                <Pill className="h-12 w-12 text-primary-300 mx-auto mb-4" />
                <p className="text-primary-600">No medications added yet. Click "Add Medication" to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <span className="text-primary-600">{label}</span>
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="font-semibold text-primary-700">{value}</span>
    </div>
  </div>
);

const ReminderCard: React.FC<{ 
  log: MedicationLog; 
  medicationName: string;
  onToggle: (logId: string, currentStatus: string) => void;
}> = ({ log, medicationName, onToggle }) => (
  <div className={`p-3 rounded-xl border-2 transition-all duration-200 ${
    log.status === 'taken' 
      ? 'border-green-200 bg-green-50' 
      : 'border-primary-200 bg-white hover:bg-primary-50'
  }`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${log.status === 'taken' ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <div>
          <div className="font-medium text-primary-700">{medicationName}</div>
          <div className="text-sm text-primary-600">
            {new Date(log.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      <button
        onClick={() => onToggle(log.id, log.status)}
        className={`p-2 rounded-lg transition-all duration-200 ${
          log.status === 'taken' 
            ? 'bg-green-100 text-green-600' 
            : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
        }`}
      >
        <CheckCircle className="h-4 w-4" />
      </button>
    </div>
  </div>
);

const MedicationCard: React.FC<{ 
  medication: Medication; 
  onDelete: (id: string) => void; 
  index: number;
}> = ({ medication, onDelete, index }) => {
  return (
    <div className="bg-white rounded-2xl p-6 neobrutalist-shadow slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <Pill className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-primary-700">{medication.name}</h3>
            <p className="text-primary-600">{medication.dosage} • {medication.frequency}</p>
          </div>
        </div>
        
        <button
          onClick={() => onDelete(medication.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Times */}
      <div className="flex items-center space-x-2 mb-4">
        <Clock className="h-4 w-4 text-primary-500" />
        <span className="text-primary-600">Times: {medication.times.join(', ')}</span>
      </div>

      {/* Notes */}
      {medication.notes && (
        <div className="bg-primary-50 p-3 rounded-lg">
          <p className="text-primary-700 text-sm">{medication.notes}</p>
        </div>
      )}
    </div>
  );
};

export default MedicationCoach;