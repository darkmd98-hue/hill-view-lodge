'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp } from '@/lib/animations';
import {
  Mountain,
  Users,
  Calendar,
  MapPin,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Save,
  Search,
  Download,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types for Admin Dashboard ──

interface Room {
  id: string;
  name: string;
  price_per_night: number;
  total_units: number;
  available_units: number;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  joined_date: string | null;
}

interface Booking {
  id: string;
  number_of_people: number;
  status: string;
  check_in_date: string;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string;
    email: string;
  } | null;
  rooms: {
    name: string;
    price_per_night: number;
  } | null;
}



export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rooms' | 'staff' | 'bookings' | 'location'>('rooms');
  
  // ── States ──
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number | string>('');
  const [editTotalUnits, setEditTotalUnits] = useState<number | string>('');
  const [editAvailableUnits, setEditAvailableUnits] = useState<number | string>('');

  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [staffForm, setStaffForm] = useState<Partial<Staff>>({
    id: '',
    name: '',
    role: 'Manager',
    phone: '',
    email: '',
    joined_date: '',
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsSearch, setBookingsSearch] = useState('');

  // Site settings state
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaveLoading, setSettingsSaveLoading] = useState(false);
  const [gmapLinkInput, setGmapLinkInput] = useState('');

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Show status notification
  const triggerNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  // ── Fetch Operations ──

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const response = await fetch('/api/admin/rooms');
      const data = await response.json();
      if (response.ok) {
        setRooms(data);
      } else {
        triggerNotification(data.error || 'Failed to fetch rooms', 'error');
      }
    } catch {
      triggerNotification('Failed to connect to rooms service', 'error');
    } finally {
      setRoomsLoading(false);
    }
  }, [triggerNotification]);

  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try {
      const response = await fetch('/api/admin/staff');
      const data = await response.json();
      if (response.ok) {
        setStaff(data);
      } else {
        triggerNotification(data.error || 'Failed to fetch staff list', 'error');
      }
    } catch {
      triggerNotification('Failed to connect to staff service', 'error');
    } finally {
      setStaffLoading(false);
    }
  }, [triggerNotification]);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const response = await fetch('/api/admin/bookings');
      const data = await response.json();
      if (response.ok) {
        setBookings(data);
      } else {
        triggerNotification(data.error || 'Failed to fetch bookings', 'error');
      }
    } catch {
      triggerNotification('Failed to connect to bookings service', 'error');
    } finally {
      setBookingsLoading(false);
    }
  }, [triggerNotification]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (response.ok && data) {
        setGmapLinkInput(data.gmap_link || '');
      }
    } catch {
      triggerNotification('Failed to load map settings', 'error');
    } finally {
      setSettingsLoading(false);
    }
  }, [triggerNotification]);

  // Load active tab data
  useEffect(() => {
    if (activeTab === 'rooms') loadRooms();
    else if (activeTab === 'staff') loadStaff();
    else if (activeTab === 'bookings') loadBookings();
    else if (activeTab === 'location') loadSettings();
  }, [activeTab, loadRooms, loadStaff, loadBookings, loadSettings]);

  // ── Handlers ──

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/admin/login');
        router.refresh();
      }
    } catch {
      triggerNotification('Logout failed.', 'error');
    }
  };

  // Rooms Pricing save
  const handleSaveRoom = async (roomId: string) => {
    try {
      const response = await fetch('/api/admin/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roomId,
          price_per_night: Number(editPrice),
          total_units: Number(editTotalUnits),
          available_units: Number(editAvailableUnits),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        triggerNotification('Room settings updated successfully.', 'success');
        setEditingRoomId(null);
        loadRooms();
      } else {
        triggerNotification(data.error || 'Failed to save room details.', 'error');
      }
    } catch {
      triggerNotification('Room update connection error.', 'error');
    }
  };

  // Staff CRUD Form Submit
  const handleStaffFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name || !staffForm.role || !staffForm.phone) {
      triggerNotification('Name, role, and phone are required.', 'error');
      return;
    }

    const isEdit = !!staffForm.id;
    const url = '/api/admin/staff';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      });

      const data = await response.json();
      if (response.ok) {
        triggerNotification(
          isEdit ? 'Staff member updated successfully.' : 'Staff member added successfully.',
          'success'
        );
        setIsStaffFormOpen(false);
        setStaffForm({
          id: '',
          name: '',
          role: 'Manager',
          phone: '',
          email: '',
          joined_date: '',
        });
        loadStaff();
      } else {
        triggerNotification(data.error || 'Failed to save staff details.', 'error');
      }
    } catch {
      triggerNotification('Staff update connection error.', 'error');
    }
  };

  const handleEditStaff = (member: Staff) => {
    setStaffForm({
      id: member.id,
      name: member.name,
      role: member.role,
      phone: member.phone,
      email: member.email || '',
      joined_date: member.joined_date || '',
    });
    setIsStaffFormOpen(true);
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const response = await fetch(`/api/admin/staff?id=${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.ok) {
        triggerNotification('Staff member deleted successfully.', 'success');
        loadStaff();
      } else {
        triggerNotification(data.error || 'Failed to delete staff member.', 'error');
      }
    } catch {
      triggerNotification('Staff delete connection error.', 'error');
    }
  };

  // Google Maps link save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaveLoading(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmap_link: gmapLinkInput }),
      });
      const data = await response.json();
      if (response.ok) {
        triggerNotification('Google Maps location link updated.', 'success');
      } else {
        triggerNotification(data.error || 'Failed to update location link.', 'error');
      }
    } catch {
      triggerNotification('Location save connection error.', 'error');
    } finally {
      setSettingsSaveLoading(false);
    }
  };

  // Filtered Bookings
  const filteredBookings = bookings.filter((b) => {
    const search = bookingsSearch.toLowerCase();
    const guestName = b.profiles?.full_name?.toLowerCase() || '';
    const guestPhone = b.profiles?.phone?.toLowerCase() || '';
    return guestName.includes(search) || guestPhone.includes(search);
  });

  // Export Bookings to Excel SheetJS
  const handleExportBookings = () => {
    const exportData = filteredBookings.map((b) => ({
      'Booking ID': b.id.slice(0, 8).toUpperCase(),
      'Guest Name': b.profiles?.full_name || 'N/A',
      'Phone Number': b.profiles?.phone || 'N/A',
      'Email Address': b.profiles?.email || 'N/A',
      'Room Reserved': b.rooms?.name || 'N/A',
      'Guests Count': b.number_of_people,
      'Check-in Date': b.check_in_date,
      'Booking Status': b.status,
      'Reserved On': new Date(b.created_at).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    
    // Auto-fit column widths
    const maxLen = exportData.reduce((acc: Record<string, number>, row: Record<string, string | number>) => {
      Object.keys(row).forEach((key) => {
        const valLen = String(row[key] || '').length;
        acc[key] = Math.max(acc[key] || key.length, valLen);
      });
      return acc;
    }, {});
    worksheet['!cols'] = Object.keys(maxLen).map((key) => ({ wch: maxLen[key] + 3 }));

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `hill-view-bookings-${dateStr}.xlsx`);
    triggerNotification('Bookings exported to Excel successfully.', 'success');
  };

  return (
    <main className="min-h-dvh bg-[#f9fafb] text-text-primary flex flex-col font-body">
      
      {/* ── Top Header Bar ── */}
      <header className="bg-white border-b border-black/5 py-4 px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🏔️</span>
          <span className="font-display italic text-lg font-semibold tracking-tight">
            Hill View <span className="text-accent not-italic font-sans text-xs uppercase ml-1.5 font-bold tracking-widest bg-accent/10 text-accent px-2 py-0.5 rounded">Staff Panel</span>
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-error transition-colors px-3 py-1.5 rounded-lg hover:bg-black/5 cursor-pointer font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out
        </button>
      </header>

      {/* ── Notification Banner ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-18 right-6 z-50 p-4 rounded-xl shadow-xl flex items-center gap-2 border text-sm max-w-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <X className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col lg:flex-row">
        
        {/* ── Left Sidebar Navigation ── */}
        <aside className="w-full lg:w-64 bg-white border-r border-black/5 p-4 space-y-1">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3 mb-2">Management</p>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'rooms' ? 'bg-accent/10 text-accent font-semibold' : 'text-text-muted hover:bg-black/5'
            }`}
          >
            <Mountain className="w-4.5 h-4.5" />
            Room Pricing
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'staff' ? 'bg-accent/10 text-accent font-semibold' : 'text-text-muted hover:bg-black/5'
            }`}
          >
            <Users className="w-4.5 h-4.5" />
            Staff Details
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'bookings' ? 'bg-accent/10 text-accent font-semibold' : 'text-text-muted hover:bg-black/5'
            }`}
          >
            <Calendar className="w-4.5 h-4.5" />
            Customer Bookings
          </button>
          <button
            onClick={() => setActiveTab('location')}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left cursor-pointer ${
              activeTab === 'location' ? 'bg-accent/10 text-accent font-semibold' : 'text-text-muted hover:bg-black/5'
            }`}
          >
            <MapPin className="w-4.5 h-4.5" />
            Location & Settings
          </button>
        </aside>

        {/* ── Main Dashboard Workspace ── */}
        <section className="flex-1 p-6 sm:p-8 overflow-x-hidden">
          
          {/* TAB 1: ROOM PRICING */}
          {activeTab === 'rooms' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display italic text-3xl font-bold text-text-primary">Room Pricing & Status</h1>
                  <p className="text-text-muted text-sm mt-1">Configure room prices and check availability slots.</p>
                </div>
              </div>

              {roomsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-surface text-text-muted font-medium border-b border-black/5">
                          <th className="py-4 px-6">Category Name</th>
                          <th className="py-4 px-6 text-right">Price per Night</th>
                          <th className="py-4 px-6 text-center">Total Units</th>
                          <th className="py-4 px-6 text-center">Available Units</th>
                          <th className="py-4 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {rooms.map((room) => {
                          const isEditing = editingRoomId === room.id;
                          return (
                            <tr key={room.id} className="hover:bg-[#fafaf9] transition-colors">
                              <td className="py-4 px-6 font-semibold text-text-primary">{room.name}</td>
                              <td className="py-4 px-6 text-right font-medium">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="form-input text-right w-28 inline-block px-2.5 py-1 text-sm"
                                  />
                                ) : (
                                  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(room.price_per_night)
                                )}
                              </td>
                              <td className="py-4 px-6 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editTotalUnits}
                                    onChange={(e) => setEditTotalUnits(e.target.value)}
                                    className="form-input text-center w-20 inline-block px-2.5 py-1 text-sm"
                                  />
                                ) : (
                                  room.total_units
                                )}
                              </td>
                              <td className="py-4 px-6 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editAvailableUnits}
                                    onChange={(e) => setEditAvailableUnits(e.target.value)}
                                    className="form-input text-center w-20 inline-block px-2.5 py-1 text-sm"
                                  />
                                ) : (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${room.available_units > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {room.available_units} / {room.total_units} Left
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-center">
                                {isEditing ? (
                                  <div className="flex justify-center gap-1.5">
                                    <button
                                      onClick={() => handleSaveRoom(room.id)}
                                      className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                      title="Save Changes"
                                    >
                                      <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setEditingRoomId(null)}
                                      className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                      title="Cancel"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingRoomId(room.id);
                                      setEditPrice(room.price_per_night);
                                      setEditTotalUnits(room.total_units);
                                      setEditAvailableUnits(room.available_units);
                                    }}
                                    className="p-1.5 text-accent bg-accent/5 hover:bg-accent/10 rounded-lg transition-colors cursor-pointer mx-auto flex items-center justify-center"
                                    title="Edit Room Pricing"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: STAFF DETAILS */}
          {activeTab === 'staff' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display italic text-3xl font-bold text-text-primary">Staff Registry</h1>
                  <p className="text-text-muted text-sm mt-1">Manage employees and register roles.</p>
                </div>
                {!isStaffFormOpen && (
                  <button
                    onClick={() => {
                      setStaffForm({
                        id: '',
                        name: '',
                        role: 'Manager',
                        phone: '',
                        email: '',
                        joined_date: '',
                      });
                      setIsStaffFormOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg shadow-accent/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Staff
                  </button>
                )}
              </div>

              {/* Add / Edit Form Panel */}
              <AnimatePresence>
                {isStaffFormOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-black/5">
                      <h2 className="font-bold text-text-primary text-lg">
                        {staffForm.id ? 'Modify Employee Info' : 'New Employee Onboarding'}
                      </h2>
                      <button
                        onClick={() => setIsStaffFormOpen(false)}
                        className="text-text-muted hover:text-text-primary cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleStaffFormSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-primary">Full Name *</label>
                        <input
                          type="text"
                          value={staffForm.name || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="form-input py-2 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-primary">Role / Position *</label>
                        <select
                          value={staffForm.role || 'Manager'}
                          onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                          className="form-input py-2 text-sm"
                          required
                        >
                          <option value="Manager">Manager</option>
                          <option value="Housekeeping">Housekeeping</option>
                          <option value="Front Desk">Front Desk</option>
                          <option value="Chef / Kitchen">Chef / Kitchen</option>
                          <option value="Security">Security</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-primary">Phone Number *</label>
                        <input
                          type="tel"
                          value={staffForm.phone || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                          placeholder="10-digit number"
                          className="form-input py-2 text-sm"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-primary">Email Address</label>
                        <input
                          type="email"
                          value={staffForm.email || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                          placeholder="optional"
                          className="form-input py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-text-primary">Joined Date</label>
                        <input
                          type="date"
                          value={staffForm.joined_date || ''}
                          onChange={(e) => setStaffForm({ ...staffForm, joined_date: e.target.value })}
                          className="form-input py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsStaffFormOpen(false)}
                          className="px-4 py-2 border border-black/5 rounded-full text-sm text-text-muted hover:bg-black/5 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-full text-sm font-semibold transition-all cursor-pointer"
                        >
                          Save Record
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {staffLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-surface text-text-muted font-medium border-b border-black/5">
                          <th className="py-4 px-6">Name</th>
                          <th className="py-4 px-6">Role</th>
                          <th className="py-4 px-6">Phone</th>
                          <th className="py-4 px-6">Email</th>
                          <th className="py-4 px-6 text-center">Joined Date</th>
                          <th className="py-4 px-6 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {staff.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 px-6 text-center text-text-muted italic">
                              No staff records found.
                            </td>
                          </tr>
                        ) : (
                          staff.map((member) => (
                            <tr key={member.id} className="hover:bg-[#fafaf9] transition-colors">
                              <td className="py-4 px-6 font-semibold text-text-primary">{member.name}</td>
                              <td className="py-4 px-6 text-text-muted">{member.role}</td>
                              <td className="py-4 px-6 font-mono">{member.phone}</td>
                              <td className="py-4 px-6 font-mono text-xs">{member.email || '—'}</td>
                              <td className="py-4 px-6 text-center">
                                {member.joined_date ? new Date(member.joined_date).toLocaleDateString() : '—'}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <div className="flex justify-center gap-1.5">
                                  <button
                                    onClick={() => handleEditStaff(member)}
                                    className="p-1.5 text-accent bg-accent/5 hover:bg-accent/10 rounded-lg transition-colors cursor-pointer"
                                    title="Edit Employee"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStaff(member.id)}
                                    className="p-1.5 text-error bg-error/5 hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Employee"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: CUSTOMER BOOKINGS */}
          {activeTab === 'bookings' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display italic text-3xl font-bold text-text-primary">Guest Bookings</h1>
                  <p className="text-text-muted text-sm mt-1">Search, audit, and export bookings.</p>
                </div>
                <button
                  onClick={handleExportBookings}
                  disabled={filteredBookings.length === 0}
                  className={`flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full transition-all border ${
                    filteredBookings.length === 0
                      ? 'border-black/5 bg-gray-50 text-text-muted cursor-not-allowed'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-lg shadow-emerald-500/10'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export to Excel
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by customer name or phone..."
                  value={bookingsSearch}
                  onChange={(e) => setBookingsSearch(e.target.value)}
                  className="form-input pl-10 py-2.5 text-sm w-full"
                />
              </div>

              {bookingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-surface text-text-muted font-medium border-b border-black/5">
                          <th className="py-4 px-6">Booking ID</th>
                          <th className="py-4 px-6">Guest Info</th>
                          <th className="py-4 px-6">Room Details</th>
                          <th className="py-4 px-6 text-center">Check-In Date</th>
                          <th className="py-4 px-6 text-center">Status</th>
                          <th className="py-4 px-6 text-center">Reserved On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5">
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 px-6 text-center text-text-muted italic">
                              No bookings match your search filters.
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-[#fafaf9] transition-colors">
                              <td className="py-4 px-6 font-mono text-xs font-semibold text-text-primary">
                                {b.id.slice(0, 8).toUpperCase()}
                              </td>
                              <td className="py-4 px-6 space-y-0.5">
                                <div className="font-semibold text-text-primary">{b.profiles?.full_name || 'N/A'}</div>
                                <div className="text-xs text-text-muted font-mono">{b.profiles?.phone}</div>
                                <div className="text-xs text-text-muted font-mono">{b.profiles?.email}</div>
                              </td>
                              <td className="py-4 px-6 space-y-0.5">
                                <div className="font-semibold text-text-primary">{b.rooms?.name || 'N/A'}</div>
                                <div className="text-xs text-text-muted">Guests: {b.number_of_people}</div>
                              </td>
                              <td className="py-4 px-6 text-center font-mono font-medium">
                                {b.check_in_date ? new Date(b.check_in_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  b.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700'
                                    : b.status === 'confirmed'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-700'
                                }`}>
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center text-xs text-text-muted font-mono">
                                {new Date(b.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: LOCATION & SETTINGS */}
          {activeTab === 'location' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6 max-w-2xl">
              <div>
                <h1 className="font-display italic text-3xl font-bold text-text-primary">Settings & Coordinates</h1>
                <p className="text-text-muted text-sm mt-1">Configure site details and embedded locations.</p>
              </div>

              {settingsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : (
                <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-4">
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="gmapLink" className="block text-sm font-semibold text-text-primary">
                        Google Maps URL Link
                      </label>
                      <input
                        id="gmapLink"
                        type="url"
                        value={gmapLinkInput}
                        onChange={(e) => setGmapLinkInput(e.target.value)}
                        placeholder="e.g. https://maps.app.goo.gl/..."
                        className="form-input text-sm py-2.5 w-full"
                        required
                      />
                      <p className="text-xs text-text-muted">
                        This link is displayed publically as the &quot;Get Directions&quot; navigation button on the contact page.
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={settingsSaveLoading}
                        className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-accent/25 transition-all cursor-pointer"
                      >
                        {settingsSaveLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Save Link
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          )}

        </section>

      </div>
    </main>
  );
}
