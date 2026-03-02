import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { 
  Plus, Search, Mail, Phone, Trash2, X, User, ExternalLink, 
  Loader2, Edit2, Building2, ShieldCheck, MapPin, ChevronDown, 
  CreditCard, Landmark 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CurrencyContext } from '../context/CurrencyContext';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { symbol } = useContext(CurrencyContext);
  const [editingClient, setEditingClient] = useState(null);
  
  const navigate = useNavigate();

  // Advanced Form State
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    businessName: '',
    taxId: '',
    paymentTerms: 'Immediate',
    creditLimit: 0,
    openingBalance: 0,
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: ''
    }
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      console.error("Error fetching clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenAddModal = () => {
    setEditingClient(null);
    setFormData(initialFormState);
    setShowAdvanced(false);
    setShowModal(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      ...initialFormState,
      ...client,
      billingAddress: client.billingAddress || initialFormState.billingAddress
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient._id}`, formData);
      } else {
        await api.post('/clients', formData);
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      alert(`Failed to ${editingClient ? 'update' : 'add'} client`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure? This will not delete their invoices but will remove them from this directory.")) {
      try {
        await api.delete(`/clients/${id}`);
        fetchClients();
      } catch (err) {
        alert("Delete failed");
      }
    }
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Client Directory</h2>
            <p className="text-slate-500 text-sm font-medium">Professional customer relationships & billing logic</p>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search clients or companies..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={handleOpenAddModal}
              className="bg-green-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-100 font-bold text-sm whitespace-nowrap"
            >
              <Plus size={18} /> Add Client
            </button>
          </div>
        </div>

        {/* Client Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-4" size={40}/>
            <p className="font-bold">Syncing Directory...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div key={client._id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl hover:border-green-100 transition-all group relative">
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-14 h-14 bg-linear-to-br from-green-50 to-emerald-50 text-green-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner border border-green-100">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(client)} className="p-2 text-slate-200 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(client._id)} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-xl mb-1">{client.name}</h3>
                  <p className="text-xs font-bold text-green-600 mb-4 flex items-center gap-1 uppercase tracking-wider">
                    <Building2 size={12} /> {client.businessName || 'Individual Account'}
                  </p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                      <Mail size={14} className="text-slate-300" /> {client.email}
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <Phone size={14} className="text-slate-300" /> {client.phone}
                      </div>
                    )}
                  </div>

                  {/* Stats Section */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-50 bg-slate-50/50 rounded-3xl px-4 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Revenue</p>
                      <p className="font-bold text-slate-800 text-lg">{symbol}{Number(client.totalInvoiced || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Terms</p>
                      <p className="font-bold text-slate-800 text-sm mt-1">{client.paymentTerms}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/invoices?clientId=${client._id}`)} 
                    className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={14} /> View History
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
                <User className="text-slate-300 mx-auto mb-4" size={40} />
                <h3 className="text-xl font-bold text-slate-800">No clients found</h3>
                <button onClick={handleOpenAddModal} className="mt-4 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm">Create Client</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Client Modal - ADVANCED VERSION */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 my-auto overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                  {editingClient ? 'Edit Professional Profile' : 'New Client Onboarding'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- Primary Contact Section --- */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Contact Information</h4>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Full Name *</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                      <input required type="text" className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                        value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Email *</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                      <input required type="email" className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                        value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Phone</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                      <input type="tel" className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                        value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* --- Business Identification Section --- */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">Business ID</h4>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Company Name</label>
                    <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                      <input type="text" className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                        value={formData.businessName} onChange={(e) => setFormData({...formData, businessName: e.target.value})} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Tax ID / VAT / GST</label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                      <input type="text" placeholder="e.g. TAX-99800" className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                        value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>

              {/* --- Advanced Settings Toggle --- */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  <ChevronDown className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} size={16} />
                  Financial & Address Details
                </button>

                {showAdvanced && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-slate-800 flex items-center gap-2"><CreditCard size={12}/> Billing Defaults</h5>
                      <select 
                        className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold border-r-8 border-transparent"
                        value={formData.paymentTerms} onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                      >
                        <option value="Immediate">Due on Receipt</option>
                        <option value="Net 15">Net 15 Days</option>
                        <option value="Net 30">Net 30 Days</option>
                        <option value="Net 60">Net 60 Days</option>
                      </select>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Credit Limit ({symbol})</label>
                          <input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm font-bold" 
                            value={formData.creditLimit} onChange={(e) => setFormData({...formData, creditLimit: e.target.value})} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Opening Bal ({symbol})</label>
                          <input type="number" className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm font-bold" 
                            value={formData.openingBalance} onChange={(e) => setFormData({...formData, openingBalance: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-slate-800 flex items-center gap-2"><MapPin size={12}/> Billing Address</h5>
                      <input placeholder="Street Address" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20" 
                        value={formData.billingAddress.street} onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, street: e.target.value}})} />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="City" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" 
                          value={formData.billingAddress.city} onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, city: e.target.value}})} />
                        <input placeholder="Country" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" 
                          value={formData.billingAddress.country} onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, country: e.target.value}})} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8">
                <button 
                  type="submit" 
                  className={`w-full text-white py-5 rounded-4xl font-black text-sm shadow-xl transition-all ${editingClient ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-100' : 'bg-slate-900 hover:bg-emerald-600 shadow-slate-200'}`}
                >
                  {editingClient ? 'Synchronize Client Data' : 'Authorize & Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;