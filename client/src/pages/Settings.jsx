import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Save, Building2, Percent, Globe, ShieldCheck, 
  Loader2, Lock, Eye, EyeOff, AlertCircle ,X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { Package } from 'lucide-react';
const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  // Settings Form State
  const [formData, setFormData] = useState({
    businessName: '',
    taxRate: 20,
    currency: 'USD',
    contactEmail: '',
    phone: '',
    businessAddress: '',
    state: '',
    gstNumber: '',
    logo: '',
    bankName: '',
    bankAccount: '',
    bankIfsc: '',
    bankBranch: '',
    upiId: '',
  });
  const DEFAULT_UNITS = ['pcs', 'kg', 'g', 'ml', 'L', 'box', 'mtr', 'set'];
const [customUnits, setCustomUnits] = useState([]);
const [newUnit, setNewUnit] = useState('');

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch existing settings and user type on load
  useEffect(() => {
    const fetchSettings = async () => {
  try {
    const res = await api.get('/auth/profile');
        setFormData({
          businessName: res.data.businessName || '',
          taxRate: res.data.taxRate || 20,
          currency: res.data.currency || 'USD',
          contactEmail: res.data.email || '',
          phone: res.data.phone || '',
          businessAddress: res.data.businessAddress || '',
          state: res.data.state || '',
          gstNumber: res.data.gstNumber || '',
          logo: res.data.logo || '',
          bankName:    res.data.bankName    || '',
          bankAccount: res.data.bankAccount || '',
          bankIfsc:    res.data.bankIfsc    || '',
          bankBranch:  res.data.bankBranch  || '',
          upiId:       res.data.upiId       || '',
        });
        // Check if user is a Google Auth user
        setIsGoogleUser(res.data.authMethod === 'google' || !!res.data.googleId);
        const unitsRes = await api.get('/auth/custom-units');
        setCustomUnits(unitsRes.data.customUnits || []);
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
const handleAddUnit = () => {
  const trimmed = newUnit.trim().toLowerCase();
  if (!trimmed) return toast.error("Enter a unit name");
  if ([...DEFAULT_UNITS, ...customUnits].includes(trimmed)) return toast.error("Unit already exists");
  setCustomUnits(prev => [...prev, trimmed]);
  setNewUnit('');
};

const handleRemoveUnit = async (unit) => {
  const updated = customUnits.filter(u => u !== unit);
  setCustomUnits(updated);
  await api.put('/auth/custom-units', { customUnits: updated });
  toast.success(`Unit "${unit}" removed`);
};

const handleSaveUnits = async () => {
  await api.put('/auth/custom-units', { customUnits });
  toast.success("Units saved!");
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
      await api.put('/auth/update-password', {
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

        {/* 1. GENERAL BUSINESS SETTINGS */}
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
            <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all font-bold"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">GST / Tax Number</label>
                <input
                  type="text"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all font-bold"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({...formData, gstNumber: e.target.value})}
                  placeholder="e.g. 22AAAAA0000A1Z5"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Business State (for GST)</label>
                <select
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all font-bold cursor-pointer"
                  value={formData.state}
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                >
                  <option value="">Select State</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Goa">Goa</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                  <option value="Ladakh">Ladakh</option>
                  <option value="Lakshadweep">Lakshadweep</option>
                  <option value="Puducherry">Puducherry</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Business Address</label>
                <textarea
                  rows="2"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm transition-all font-bold resize-none"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData({...formData, businessAddress: e.target.value})}
                  placeholder="123 Business St, City, Country"
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

          {/* ── LOGO UPLOAD ── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-slate-800">
              <Building2 size={20} className="text-purple-500" />
              <h3 className="font-bold">Business Logo</h3>
              <span className="text-[10px] font-bold text-slate-400 ml-1">— appears on all invoices & PDFs</span>
            </div>
            <div className="flex items-start gap-6">
              {/* Preview */}
              <div className="shrink-0 w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                {formData.logo
                  ? <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                  : <span className="text-slate-300 text-xs font-bold text-center px-2">No Logo</span>
                }
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Upload Logo Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 500 * 1024) return toast.error('Logo must be under 500KB');
                      const reader = new FileReader();
                      reader.onload = (ev) => setFormData(p => ({ ...p, logo: ev.target.result }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 ml-1">PNG or JPG, max 500KB. Square logo recommended.</p>
                </div>
                {formData.logo && (
                  <button type="button"
                    onClick={() => setFormData(p => ({...p, logo: ''}))}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors">
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── BANK DETAILS ── */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-slate-800">
              <Save size={20} className="text-indigo-500" />
              <h3 className="font-bold">Bank & Payment Details</h3>
              <span className="text-[10px] font-bold text-slate-400 ml-1">— printed on invoices for easy payment</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Bank Name</label>
                <input type="text" placeholder="e.g. State Bank of India"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold transition-all"
                  value={formData.bankName}
                  onChange={e => setFormData(p => ({...p, bankName: e.target.value}))} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Account Number</label>
                <input type="text" placeholder="e.g. 1234567890"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold transition-all"
                  value={formData.bankAccount}
                  onChange={e => setFormData(p => ({...p, bankAccount: e.target.value}))} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">IFSC Code</label>
                <input type="text" placeholder="e.g. SBIN0001234"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold transition-all uppercase"
                  value={formData.bankIfsc}
                  onChange={e => setFormData(p => ({...p, bankIfsc: e.target.value.toUpperCase()}))} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Branch Name</label>
                <input type="text" placeholder="e.g. MG Road, Kochi"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold transition-all"
                  value={formData.bankBranch}
                  onChange={e => setFormData(p => ({...p, bankBranch: e.target.value}))} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">UPI ID (optional)</label>
                <input type="text" placeholder="e.g. yourname@upi"
                  className="w-full p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold transition-all"
                  value={formData.upiId}
                  onChange={e => setFormData(p => ({...p, upiId: e.target.value}))} />
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

        {/* 2. SECURITY SECTION (Conditional based on Login Method) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <ShieldCheck size={20} className="text-orange-500" />
            <h3 className="font-bold">Security & Authentication</h3>
          </div>

          {isGoogleUser ? (
            /* Google Auth Message */
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
            /* Email/Password Form */
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
        <hr className="my-10 border-slate-200" />

{/* UNITS MANAGEMENT */}
<div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
  <div className="flex items-center gap-2 mb-6 text-slate-800">
    <Package size={20} className="text-purple-500" />
    <h3 className="font-bold">Product Units</h3>
  </div>

  {/* Default units — read only */}
  <div className="mb-5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">
      Default Units
    </label>
    <div className="flex flex-wrap gap-2">
      {DEFAULT_UNITS.map(unit => (
        <span key={unit} className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-black rounded-xl uppercase">
          {unit}
        </span>
      ))}
    </div>
  </div>

  {/* Custom units — removable */}
  <div className="mb-5">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">
      Custom Units
    </label>
    {customUnits.length === 0 ? (
      <p className="text-xs text-slate-400 font-medium ml-1">No custom units added yet.</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {customUnits.map(unit => (
          <span key={unit} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-black rounded-xl uppercase border border-purple-100">
            {unit}
            <button
              type="button"
              onClick={() => handleRemoveUnit(unit)}
              className="text-purple-400 hover:text-purple-700 transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
    )}
  </div>

  {/* Add new unit */}
  <div className="flex gap-3">
    <input
      type="text"
      placeholder="e.g. dozen, pack, ft..."
      value={newUnit}
      onChange={(e) => setNewUnit(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUnit())}
      className="flex-1 p-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 text-sm font-bold"
    />
    <button
      type="button"
      onClick={handleAddUnit}
      className="px-5 py-3 bg-purple-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-purple-700 transition-all"
    >
      Add
    </button>
  </div>

  <div className="flex justify-end mt-4">
    <button
      type="button"
      onClick={handleSaveUnits}
      className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-purple-600 transition-all shadow-xl shadow-slate-200"
    >
      <Save size={18} /> Save Units
    </button>
  </div>
</div>
      </div>
    </div>
  );
};

export default Settings;