import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, TrendingUp, Bell, Search, Filter } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, Appointment } from '../lib/supabase';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  completedToday: number;
  revenue: number;
}

const DoctorsDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    completedToday: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    if (user && profile?.role === 'doctor') {
      fetchDoctorId();
    }
  }, [user, profile]);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorAppointments();
      fetchDashboardStats();
    }
  }, [doctorId, selectedDate]);

  const fetchDoctorId = async () => {
    if (!user) return;

    try {
      // Use maybeSingle to handle missing doctor records gracefully
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (doctorError) {
        console.error('Error fetching doctor ID:', doctorError);
        return;
      }

      if (!doctorData) {
        console.log('No doctor record found for user, creating one...');
        // Create doctor record if it doesn't exist
        await createDoctorRecord();
        return;
      }

      setDoctorId(doctorData.id);
    } catch (error) {
      console.error('Error in fetchDoctorId:', error);
    }
  };

  const createDoctorRecord = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('doctors')
        .insert({
          user_id: user.id,
          specialty: 'General Practice',
          rating: 0,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating doctor record:', error);
        return;
      }

      console.log('Doctor record created successfully');
      setDoctorId(data.id);
    } catch (error) {
      console.error('Error in createDoctorRecord:', error);
    }
  };

  const fetchDoctorAppointments = async () => {
    if (!doctorId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles(*)
        `)
        .eq('doctor_id', doctorId)
        .eq('appointment_date', selectedDate)
        .order('appointment_time');

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    if (!doctorId) return;

    try {
      // Get today's appointments
      const { data: todayAppointments, error: todayError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', selectedDate);

      if (todayError) throw todayError;

      // Get completed appointments today
      const completedToday = todayAppointments?.filter(apt => apt.status === 'completed').length || 0;

      // Get total unique patients
      const { data: allAppointments, error: allError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('doctor_id', doctorId);

      if (allError) throw allError;

      const uniquePatients = new Set(allAppointments?.map(apt => apt.patient_id)).size;

      setStats({
        totalPatients: uniquePatients,
        todayAppointments: todayAppointments?.length || 0,
        completedToday,
        revenue: completedToday * 150, // Assuming $150 per appointment
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Refresh appointments and stats
      await fetchDoctorAppointments();
      await fetchDashboardStats();
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const filteredAppointments = appointments.filter(appointment => {
    const patient = appointment.patient;
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (appointment.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!user || profile?.role !== 'doctor') {
    return (
      <div className="max-w-7xl mx-auto fade-in text-center">
        <h1 className="text-3xl font-bold text-primary-700 mb-4">Doctor's Dashboard</h1>
        <p className="text-primary-600 mb-6">This dashboard is only available for doctors.</p>
      </div>
    );
  }

  if (!doctorId && !loading) {
    return (
      <div className="max-w-7xl mx-auto fade-in text-center">
        <h1 className="text-3xl font-bold text-gray-700 mb-4">Setting up your doctor profile...</h1>
        <p className="text-gray-600 mb-6">Please wait while we create your doctor profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto fade-in px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-700 mb-2">Doctor's Dashboard</h1>
          <p className="text-gray-600">Manage your appointments and track patient care</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <button className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-xl shadow-lg hover:bg-blue-600 transition-all duration-200">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Patients"
          value={stats.totalPatients.toLocaleString()}
          icon={Users}
          color="bg-blue-500"
          change="+12%"
        />
        <StatsCard
          title="Today's Appointments"
          value={stats.todayAppointments.toString()}
          icon={Calendar}
          color="bg-green-500"
          change="+5%"
        />
        <StatsCard
          title="Completed Today"
          value={stats.completedToday.toString()}
          icon={Clock}
          color="bg-purple-500"
          change="+8%"
        />
        <StatsCard
          title="Today's Revenue"
          value={`$${stats.revenue.toLocaleString()}`}
          icon={TrendingUp}
          color="bg-orange-500"
          change="+15%"
        />
      </div>

      {/* Appointments Section */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 md:mb-0">
              Today's Appointments
            </h2>
            
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment, index) => (
              <PatientCard
                key={appointment.id}
                appointment={appointment}
                onStatusUpdate={updateAppointmentStatus}
                index={index}
              />
            ))
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No appointments found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  change: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, change }) => (
  <div className="bg-white rounded-2xl p-6 shadow-lg">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <span className="text-green-600 text-sm font-medium">{change}</span>
    </div>
    <div className="text-2xl font-bold text-gray-700 mb-1">{value}</div>
    <div className="text-gray-600 text-sm">{title}</div>
  </div>
);

interface PatientCardProps {
  appointment: Appointment;
  onStatusUpdate: (appointmentId: string, status: Appointment['status']) => void;
  index: number;
}

const PatientCard: React.FC<PatientCardProps> = ({ appointment, onStatusUpdate, index }) => {
  const patient = appointment.patient;
  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'scheduled': return 'bg-yellow-100 text-yellow-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">{patientName}</h3>
            <p className="text-gray-600 text-sm">{appointment.reason || 'No reason specified'}</p>
            <div className="flex items-center mt-1">
              <Clock className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-gray-600 text-sm">{appointment.appointment_time}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
            {appointment.status.replace('-', ' ').toUpperCase()}
          </span>
          
          <select
            value={appointment.status}
            onChange={(e) => onStatusUpdate(appointment.id, e.target.value as Appointment['status'])}
            className="px-3 py-1 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default DoctorsDashboard;