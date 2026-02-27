import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Percent, Globe, User } from 'lucide-react';

const CreateInvoiceModal = ({ isOpen, onClose, onRefresh }) => {
  const [clients, setClients] = useState([]); // Store fetched clients
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState(''); // Fallback or display name
  const [taxRate, setTaxRate] = useState(15);
  const [currency, setCurrency] = useState({ code: 'USD', symbol: '$' });
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);

  // Fetch clients from your new API when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchClients = async () => {
        try {
          const { data } = await axios.get('http://localhost:5000/api/clients');
          setClients(data);
        } catch (err) {
          console.error("Error fetching clients", err);
        }
      };
      fetchClients();
    }
  }, [isOpen]);

  const currencies = [
    { label: 'US Dollar ($)', code: 'USD', symbol: '$' },
    { label: 'Indian Rupee (₹)', code: 'INR', symbol: '₹' },
    { label: 'Euro (€)', code: 'EUR', symbol: '€' },
    { label: 'Kuwaiti Dinar (KD)', code: 'KD', symbol: 'KD' },
  ];

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    const client = clients.find(c => c._id === clientId);
    if (client) setClientName(client.name);
  };

  // ... (keep addItem, removeItem, updateItem functions from previous steps)

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/invoices', {
        clientName, // This is now sourced from your selection
        items,
        taxRate: Number(taxRate),
        currency: currency.code,
        currencySymbol: currency.symbol,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
      onRefresh();
      onClose();
    } catch (err) {
      alert("Error saving invoice");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900">New Invoice</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NEW: Client Selection Dropdown */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Client</label>
              <div className="relative">
                <select 
                  className="w-full p-3 pl-10 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  value={selectedClientId}
                  onChange={handleClientChange}
                  required
                >
                  <option value="">— Choose a Client —</option>
                  {clients.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <User size={18} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>

            {/* Currency Dropdown */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
              <select 
                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={currency.code}
                onChange={(e) => setCurrency(currencies.find(c => c.code === e.target.value))}
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ... rest of the form (Items, Subtotal, etc.) */}
          
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all">
            Save and Send Invoice
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;