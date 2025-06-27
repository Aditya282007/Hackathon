/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Stethoscope, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface Doctor {
  id: string;
  user_id: string;
  specialty: string;
  rating: number;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  notes: string;
  doctor: {
    specialty: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

export function AppointmentScheduler() {
  const { user} = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'appointments'>('schedule');

  useEffect(() => {
    fetchDoctors();
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchDoctors = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          user_id,
          specialty,
          rating,
          profiles:user_id (
            first_name,
            last_name
          )
        `);

      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const fetchAppointments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          reason,
          notes,
          doctors:doctor_id (
            specialty,
            profiles:user_id (
              first_name,
              last_name
            )
          )
        `)
        .eq('patient_id', user.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setMessage('Please sign in to schedule an appointment.');
      return;
    }

    if (!selectedDoctor || !appointmentDate || !appointmentTime || !reason) {
      setMessage('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: user.id,
          doctor_id: selectedDoctor,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason: reason,
          status: 'scheduled',
        });

      if (error) throw error;

      setMessage('Appointment scheduled successfully!');
      setSelectedDoctor('');
      setAppointmentDate('');
      setAppointmentTime('');
      setReason('');
      
      // Refresh appointments list
      fetchAppointments();
      
      // Switch to appointments tab to show the new appointment
      setActiveTab('appointments');
    } catch (error: any) {
      console.error('Error scheduling appointment:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'in-progress':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 9; hour <= 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push(time);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Appointment Management</h1>
          <p className="text-blue-100">
            Schedule appointments with healthcare providers or view your existing appointments.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'schedule'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Schedule Appointment
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'appointments'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Appointments ({appointments.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'schedule' ? (
            <form onSubmit={handleScheduleAppointment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Stethoscope className="w-4 h-4 mr-2" />
                    Select Doctor
                  </label>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.profiles?.first_name} {doctor.profiles?.last_name} - {doctor.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 mr-2" />
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 mr-2" />
                    Appointment Time
                  </label>
                  <select
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select time...</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2" />
                    Reason for Visit
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Brief description of your concern"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.includes('Error') 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !user}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Scheduling...' : 'Schedule Appointment'}
              </button>

              {!user && (
                <p className="text-center text-gray-600">
                  Please sign in to schedule an appointment.
                </p>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments scheduled</h3>
                  <p className="text-gray-600 mb-4">You haven't scheduled any appointments yet.</p>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Schedule Your First Appointment
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <Stethoscope className="w-5 h-5 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              Dr. {appointment.doctor?.profiles?.first_name} {appointment.doctor?.profiles?.last_name}
                            </h3>
                          </div>
                          <p className="text-gray-600 mb-2">{appointment.doctor?.specialty}</p>
                          
                          <div className="flex items-center text-sm text-gray-600 mb-2">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(appointment.appointment_date).toLocaleDateString()}
                            <Clock className="w-4 h-4 ml-4 mr-1" />
                            {appointment.appointment_time}
                          </div>
                          
                          <p className="text-gray-800 mb-2">
                            <strong>Reason:</strong> {appointment.reason}
                          </p>
                          
                          {appointment.notes && (
                            <p className="text-gray-600 text-sm">
                              <strong>Notes:</strong> {appointment.notes}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center ml-4">
                          {getStatusIcon(appointment.status)}
                          <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}