import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Save, Building2, Percent, Globe, ShieldCheck, 
  Loader2, Lock, Eye, EyeOff, AlertCircle 
} from 'lucide-react';
import { toast } from 'react-toastify';
const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    taxRate: 20,
    currency: 'USD',
    contactEmail: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/auth/profile');
        setFormData({
          businessName: res.data.businessName || '',
          taxRate: res.data.taxRate || 20,
          currency: res.data.currency || 'USD',
          contactEmail: res.data.email || ''
        });
        setIsGoogleUser(res.data.authMethod === 'google' || !!res.data.googleId);
      } catch (err) {
        console.error("Failed to load settings");
        toast.error("Failed to load profile settings");
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, []);
  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/update-settings', formData);
      toast.success("General settings updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    if (passwordData.newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    setLoading(true);
    try {
      await api.put('/accounts/update-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      toast.success("Password updated successfully!");
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };
  if (fetching) return (
    <div className="flex flex-col items-center justify-center min-h-screen text-slate-400">
      <Loader2 className="animate-spin mb-2" size={32} />
      <p className="font-bold text-xs uppercase tracking-widest">Syncing Preferences...</p>
    </div>
  );
  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto pb-20">
        <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h2>
          <p className="text-slate-500">Configure your business identity and security credentials</p>
        </div>
        <form onSubmit={handleSettingsSubmit} className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-slate-800">
              <Building2 size={20} className="text-blue-500" />
              <h3 className="font-bold">Business Profile</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Business Name</label>
                <input 
                  type="text"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all font-bold"
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Contact Email</label>
                <input 
                  type="email"
                  className="w-full p-3 bg-slate-200 border-none rounded-2xl outline-none text-slate-500 text-sm cursor-not-allowed font-medium"
                  value={formData.contactEmail}
                  disabled
                />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-slate-800">
              <Percent size={20} className="text-green-500" />
              <h3 className="font-bold">Tax & Localization</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Default Tax Rate (%)</label>
                <input 
                  type="number"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm transition-all font-bold"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({...formData, taxRate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Preferred Currency</label>
                <select 
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm transition-all font-bold cursor-pointer"
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Save General Settings
            </button>
          </div>
        </form>
        <hr className="my-10 border-slate-200" />
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <ShieldCheck size={20} className="text-orange-500" />
            <h3 className="font-bold">Security & Authentication</h3>
          </div>
          {isGoogleUser ? (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 className="font-black text-blue-900 text-sm uppercase tracking-tight">Logged in via Google</h4>
                <p className="text-blue-700/70 text-xs font-medium mt-1 leading-relaxed">
                  Your account is secured via Google OAuth. Password management and 2FA are handled through your Google Security settings.
                </p>
                <a 
                  href="https://myaccount.google.com/security" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all"
                >
                  External Security Settings
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-bold"
                    placeholder="••••••••"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <input 
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-bold"
                    placeholder="New password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500/20 text-sm font-bold"
                    placeholder="Confirm password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-xl shadow-orange-100 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
                  Update Password
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default Settings;