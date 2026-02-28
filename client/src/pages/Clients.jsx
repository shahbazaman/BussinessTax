import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Search, Mail, Phone, Trash2, X, User, ExternalLink, Loader2, Edit2 } from 'lucide-react'; // Added Edit2
import { useNavigate } from 'react-router-dom';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New state to track if we are editing
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const navigate = useNavigate();

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

  // Handle opening the modal for a NEW client
  const handleOpenAddModal = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '', phone: '' });
    setShowModal(true);
  };

  // Handle opening the modal for EDITING a client
  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({ name: client.name, email: client.email, phone: client.phone || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        // UPDATE MODE
        await api.put(`/clients/${editingClient._id}`, formData);
      } else {
        // CREATE MODE
        await api.post('/clients', formData);
      }
      
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '' });
      setEditingClient(null);
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
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Client Directory</h2>
            <p className="text-slate-500 text-sm font-medium">Manage your customer relationships and billing history</p>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search clients..."
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
                    
                    {/* EDIT & DELETE BUTTONS */}
                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client);
                        }}
                        className="p-2 text-slate-200 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client._id);
                        }}
                        className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-xl mb-1">{client.name}</h3>
                  
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
                      <p className="font-bold text-slate-800 text-lg">${Number(client.totalInvoiced || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Invoices</p>
                      <p className="font-bold text-slate-800 text-lg">{client.invoiceCount || 0}</p>
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
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-slate-300" size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">No clients found</h3>
                <p className="text-slate-500 mb-6">Start by adding your first business contact.</p>
                <button 
                  onClick={handleOpenAddModal}
                  className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm"
                >
                  Create Client
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {editingClient ? 'Edit Client' : 'New Client'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm transition-colors">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                  <input 
                    required type="text" placeholder="e.g. Jane Cooper" 
                    className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold transition-all placeholder:text-slate-300"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                  <input 
                    required type="email" placeholder="jane@company.com" 
                    className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold transition-all placeholder:text-slate-300"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Phone Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-green-500 transition-colors" size={18} />
                  <input 
                    type="tel" placeholder="+1 (555) 000-0000" 
                    className="w-full pl-11 p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold transition-all placeholder:text-slate-300"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  className={`w-full text-white py-4 rounded-2xl font-black text-sm shadow-xl transition-all ${editingClient ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-200'}`}
                >
                  {editingClient ? 'Save Changes' : 'Create Client Profile'}
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