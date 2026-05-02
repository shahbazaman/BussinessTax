import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import {
  User, Mail, Phone, Building2, MapPin, Hash,
  Percent, Globe, Camera, Loader2, Save, CheckCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

const Profile = () => {
  const { user, setUser, updateUser } = useContext(AuthContext);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '', email: '', businessName: '', phone: '',
    businessAddress: '', gstNumber: '', taxRate: 20,
    currency: 'USD', profilePhoto: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setFormData({
          name: res.data.name || '',
          email: res.data.email || '',
          businessName: res.data.businessName || '',
          phone: res.data.phone || '',
          businessAddress: res.data.businessAddress || '',
          gstNumber: res.data.gstNumber || '',
          taxRate: res.data.taxRate || 20,
          currency: res.data.currency || 'USD',
          profilePhoto: res.data.profilePhoto || ''
        });
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');

    const data = new FormData();
    data.append('photo', file);
    setUploading(true);
    try {
      const res = await api.post('/auth/upload-photo', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newPhoto = res.data.profilePhoto;
      setFormData(prev => ({ ...prev, profilePhoto: newPhoto }));
      updateUser({ profilePhoto: newPhoto });
      toast.success('Profile photo updated! Also synced as business logo.');
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/update-settings', formData);
      updateUser({ name: formData.name, profilePhoto: formData.profilePhoto });
      toast.success('Profile saved!');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (fetching) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-slate-400">
      <Loader2 className="animate-spin mb-2" size={32} />
      <p className="font-bold text-xs uppercase tracking-widest">Loading Profile...</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto pb-20">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">My Profile</h2>
          <p className="text-slate-500">Manage your personal and business information</p>
        </div>

        {/* Avatar Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-6 flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-green-500 flex items-center justify-center shadow-lg">
              {formData.profilePhoto ? (
                <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white">
                  {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition-all shadow-md"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">{formData.name}</h3>
            <p className="text-slate-400 text-sm">{formData.email}</p>
            <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full">
              {user?.role || 'Admin'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-slate-800">
              <User size={20} className="text-purple-500" />
              <h3 className="font-bold">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Full Name</label>
                <input
                  type="text"
                  className="w-full p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 text-sm font-bold border-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Email</label>
                <input
                  type="email"
                  className="w-full p-3 bg-slate-200 rounded-2xl text-slate-500 text-sm font-medium cursor-not-allowed border-none outline-none"
                  value={formData.email}
                  disabled
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Phone</label>
                <input
                  type="tel"
                  className="w-full p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 text-sm font-bold border-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 00000 00000"
                />
              </div>
            </div>
          </div>

          {/* Business Info */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-slate-800">
              <Building2 size={20} className="text-blue-500" />
              <h3 className="font-bold">Business Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Business Name</label>
                <input
                  type="text"
                  className="w-full p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold border-none"
                  value={formData.businessName}
                  onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">GST / Tax Number</label>
                <input
                  type="text"
                  className="w-full p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold border-none"
                  value={formData.gstNumber}
                  onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Business Address</label>
                <textarea
                  rows="2"
                  className="w-full p-3 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-bold border-none resize-none"
                  value={formData.businessAddress}
                  onChange={e => setFormData({ ...formData, businessAddress: e.target.value })}
                  placeholder="123 Business St, City"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-green-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-70"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;