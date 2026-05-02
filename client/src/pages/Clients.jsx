import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { 
  Plus, Search, Mail, Phone, Trash2, X, User, ExternalLink, 
  Loader2, Edit2, Building2, ShieldCheck, MapPin, ChevronDown, 
  CreditCard, Truck, Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CurrencyContext } from '../context/CurrencyContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const Clients = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { symbol } = useContext(CurrencyContext);
  const [editingClient, setEditingClient] = useState(null);  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const navigate = useNavigate();
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    clientType: 'Individual', 
    businessName: '',
    taxId: '',
    paymentTerms: 'Immediate',
    businessCategory: '',
    customBusinessCategory: '',
    creditLimit: 0,
    openingBalance: 0,
    billingAddress: { street: '', city: '', state: '', zip: '', country: '' },
    shippingAddress: { street: '', city: '', state: '', zip: '', country: '' }
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
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
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
      billingAddress: client.billingAddress || initialFormState.billingAddress,
      shippingAddress: client.shippingAddress || initialFormState.shippingAddress
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        businessCategory: formData.businessCategory === 'Other' 
          ? formData.customBusinessCategory 
          : formData.businessCategory
      };
      if (editingClient) {
        await api.put(`/clients/${editingClient._id}`, submitData);
      } else {
        await api.post('/clients', submitData);
      }
      setShowModal(false);
      fetchClients();
    } catch (err) {
      toast.error('Failed to save client data');
    }
  };

  const handleDelete = async (id) => {
    toast(
  ({ closeToast }) => (
    <div>
      <p className="font-bold text-sm mb-2">Remove this client?</p>
      <p className="text-xs text-slate-500 mb-3">This will remove the client from the directory.</p>
      <div className="flex gap-2">
        <button onClick={async () => {
          closeToast();
          try {
            await api.delete(`/clients/${id}`);
            toast.success("Client removed successfully");
            fetchClients();
          } catch (err) {
            toast.error("Delete failed");
          }
        }} className="bg-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
          Yes, Remove
        </button>
        <button onClick={closeToast} className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg">
          Cancel
        </button>
      </div>
    </div>
  ),
  { autoClose: false, closeButton: false }
);
  };

  const copyBillingToShipping = () => {
    setFormData({
      ...formData,
      shippingAddress: { ...formData.billingAddress }
    });
  };

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
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
                placeholder="Search clients..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm transition-all"
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

{/* Client Table */}
{loading ? (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
    <Loader2 className="animate-spin mb-4" size={40}/>
    <p className="font-bold">Syncing Directory...</p>
  </div>
) : (
  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
            <th className="px-6 py-4">Client</th>
            <th className="px-6 py-4">Contact</th>
            <th className="px-6 py-4">Type</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Terms</th>
            <th className="px-6 py-4">Revenue</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {filteredClients.length > 0 ? paginatedClients.map((client) => (
            <tr key={client._id} className="hover:bg-slate-50/50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center font-black text-lg border border-slate-100 uppercase shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{client.name}</p>
                    <p className="text-[10px] font-bold text-green-600 uppercase">{client.businessName || 'Individual'}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Mail size={12} className="text-slate-300" /> {client.email}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${client.clientType === 'Business' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  {client.clientType}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-[10px] font-bold text-slate-500">
                  {client.businessCategory || <span className="text-slate-300">—</span>}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className="text-xs font-bold text-slate-600">{client.paymentTerms}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm font-black text-slate-800">{symbol}{Number(client.totalInvoiced || 0).toLocaleString()}</span>
              </td>
              <td className="px-6 py-4">
               <div className="flex items-center justify-end gap-2">
                  <button onClick={() => navigate(`/clients/${client._id}/invoices`)}
                    className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all" title="View History">
                    <ExternalLink size={15} />
                  </button>
                  <button onClick={() => handleEdit(client)}
                    className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(client._id)}
                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="7" className="px-6 py-20 text-center">
                <User className="text-slate-300 mx-auto mb-4" size={40} />
                <p className="text-slate-400 font-bold">No clients found</p>
                <button onClick={handleOpenAddModal} className="mt-4 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm">Create Client</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    {filteredClients.length > itemsPerPage && (
  <div className="flex justify-center gap-2 py-4">
    <button onClick={() => setCurrentPage(p => Math.max(p-1, 1))} disabled={currentPage === 1}
      className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-200 disabled:opacity-40">Prev</button>
    {Array.from({length: totalPages}, (_, i) => i+1).map(page => (
      <button key={page} onClick={() => setCurrentPage(page)}
        className={`px-3 py-1 rounded-lg text-xs font-bold ${page === currentPage ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>
        {page}
      </button>
    ))}
    <button onClick={() => setCurrentPage(p => Math.min(p+1, totalPages))} disabled={currentPage === totalPages}
      className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-200 disabled:opacity-40">Next</button>
  </div>
)}
  </div>
)}
      </div>

      {/* Add/Edit Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {editingClient ? 'Edit Client Profile' : 'New Client Onboarding'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto no-scrollbar flex-1">            
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Core Identity</h4>
                  <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                    {['Individual', 'Business'].map((type) => (
                      <button key={type} type="button" onClick={() => setFormData({...formData, clientType: type})}
                        className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${formData.clientType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                  <input required placeholder="Individual / Business Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  <input required type="email" placeholder="Email Address" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                    value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Business Specs</h4>
                  
                  <input placeholder="GSTIN (e.g. 22AAAAA0000A1Z5)" className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold" 
                    value={formData.taxId} onChange={(e) => setFormData({...formData, taxId: e.target.value})} />
                    <select className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500/20 text-sm font-bold"
                      value={formData.businessCategory} 
                      onChange={(e) => setFormData({...formData, businessCategory: e.target.value, customBusinessCategory: ''})}>
                      <option value="">Select Business Category</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Retailer">Retailer</option>
                      <option value="Manufacturer">Manufacturer</option>
                      <option value="Distributor">Distributor</option>
                      <option value="Service Provider">Service Provider</option>
                      <option value="Freelancer">Freelancer</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.businessCategory === 'Other' && (
                      <input
                        placeholder="Specify business category..."
                        className="w-full p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl outline-none text-sm font-bold text-blue-700 mt-2"
                        value={formData.customBusinessCategory}
                        onChange={(e) => setFormData({...formData, customBusinessCategory: e.target.value})}
                        required
                      />
                    )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  <ChevronDown className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} size={16} />
                  Financials & Addresses
                </button>

                {showAdvanced && (
                  <div className="mt-6 space-y-8 animate-in slide-in-from-top-4 duration-300">
                    {/* Financials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-4xl">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><CreditCard size={12}/> Payment Terms</label>
                        <select className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none shadow-sm" value={formData.paymentTerms} onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}>
                          <option value="Immediate">Due on Receipt</option>
                          <option value="Net 7">Net 7</option>
                          <option value="Net 15">Net 15</option>
                          <option value="Net 30">Net 30</option>
                          <option value="Net 60">Net 60</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1"><ShieldCheck size={12}/> Credit Limit</label>
                        <input type="number" className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none" value={formData.creditLimit} onChange={(e) => setFormData({...formData, creditLimit: e.target.value})} />
                      </div>
                    </div>

                    {/* Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Billing */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-slate-800 flex items-center gap-2"><MapPin size={14}/> BILLING ADDRESS</h5>
                        <input placeholder="Street" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.billingAddress.street} onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, street: e.target.value}})} />
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="City" className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.billingAddress.city} onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, city: e.target.value}})} />
                          <input placeholder="ZIP / Pincode" className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.billingAddress.zip} onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, zip: e.target.value}})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none cursor-pointer"
                            value={formData.billingAddress.state}
                            onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, state: e.target.value}})}
                          >
                            <option value="">Select State</option>
                            <option>Andhra Pradesh</option><option>Arunachal Pradesh</option>
                            <option>Assam</option><option>Bihar</option><option>Chhattisgarh</option>
                            <option>Goa</option><option>Gujarat</option><option>Haryana</option>
                            <option>Himachal Pradesh</option><option>Jharkhand</option>
                            <option>Karnataka</option><option>Kerala</option>
                            <option>Madhya Pradesh</option><option>Maharashtra</option>
                            <option>Manipur</option><option>Meghalaya</option><option>Mizoram</option>
                            <option>Nagaland</option><option>Odisha</option><option>Punjab</option>
                            <option>Rajasthan</option><option>Sikkim</option><option>Tamil Nadu</option>
                            <option>Telangana</option><option>Tripura</option><option>Uttar Pradesh</option>
                            <option>Uttarakhand</option><option>West Bengal</option>
                            <option>Andaman and Nicobar Islands</option><option>Chandigarh</option>
                            <option>Dadra and Nagar Haveli and Daman and Diu</option>
                            <option>Delhi</option><option>Jammu and Kashmir</option>
                            <option>Ladakh</option><option>Lakshadweep</option><option>Puducherry</option>
                          </select>
                          <input placeholder="Country" className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.billingAddress.country} onChange={(e) => setFormData({...formData, billingAddress: {...formData.billingAddress, country: e.target.value}})} />
                        </div>
                      </div>

                      {/* Shipping */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h5 className="text-[10px] font-black text-slate-800 flex items-center gap-2"><Truck size={14}/> SHIPPING ADDRESS</h5>
                          <button type="button" onClick={copyBillingToShipping} className="text-[8px] font-black text-blue-600 uppercase flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"><Copy size={10}/> Same as billing</button>
                        </div>
                        <input placeholder="Street" className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.shippingAddress.street} onChange={(e) => setFormData({...formData, shippingAddress: {...formData.shippingAddress, street: e.target.value}})} />
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="City" className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.shippingAddress.city} onChange={(e) => setFormData({...formData, shippingAddress: {...formData.shippingAddress, city: e.target.value}})} />
                          <input placeholder="ZIP / Pincode" className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.shippingAddress.zip} onChange={(e) => setFormData({...formData, shippingAddress: {...formData.shippingAddress, zip: e.target.value}})} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none cursor-pointer"
                            value={formData.shippingAddress.state}
                            onChange={(e) => setFormData({...formData, shippingAddress: {...formData.shippingAddress, state: e.target.value}})}
                          >
                            <option value="">Select State</option>
                            <option>Andhra Pradesh</option><option>Arunachal Pradesh</option>
                            <option>Assam</option><option>Bihar</option><option>Chhattisgarh</option>
                            <option>Goa</option><option>Gujarat</option><option>Haryana</option>
                            <option>Himachal Pradesh</option><option>Jharkhand</option>
                            <option>Karnataka</option><option>Kerala</option>
                            <option>Madhya Pradesh</option><option>Maharashtra</option>
                            <option>Manipur</option><option>Meghalaya</option><option>Mizoram</option>
                            <option>Nagaland</option><option>Odisha</option><option>Punjab</option>
                            <option>Rajasthan</option><option>Sikkim</option><option>Tamil Nadu</option>
                            <option>Telangana</option><option>Tripura</option><option>Uttar Pradesh</option>
                            <option>Uttarakhand</option><option>West Bengal</option>
                            <option>Andaman and Nicobar Islands</option><option>Chandigarh</option>
                            <option>Dadra and Nagar Haveli and Daman and Diu</option>
                            <option>Delhi</option><option>Jammu and Kashmir</option>
                            <option>Ladakh</option><option>Lakshadweep</option><option>Puducherry</option>
                          </select>
                          <input placeholder="Country" className="p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none" value={formData.shippingAddress.country} onChange={(e) => setFormData({...formData, shippingAddress: {...formData.shippingAddress, country: e.target.value}})} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-8">
                <button type="submit" className={`w-full text-white py-5 rounded-4xl font-black text-sm shadow-xl transition-all ${editingClient ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-emerald-600'}`}>
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