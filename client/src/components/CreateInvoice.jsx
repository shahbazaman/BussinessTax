// // import React, { useState, useEffect, useContext } from 'react';
// // import { PDFDownloadLink } from '@react-pdf/renderer';
// // import InvoicePDF from './InvoicePDF';
// // import api from '../utils/api'; // Ensure this is imported
// // import { toast } from 'react-toastify';
// // import { 
// //   FileDown, Plus, Trash2, Receipt, Truck, Percent, 
// //   Calendar, User, Hash, Info, Package, Printer
// // } from 'lucide-react';
// // import { CurrencyContext } from '../context/CurrencyContext';

// // const CreateInvoice = () => {
// //   const { symbol } = useContext(CurrencyContext);
  
// //   // State for dropdowns
// //   const [dbClients, setDbClients] = useState([]);
// //   const [dbProducts, setDbProducts] = useState([]);

// //   const [invoice, setInvoice] = useState({
// //     invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
// //     poNumber: '',
// //     date: new Date().toISOString().split('T')[0],
// //     dueDate: '',
// //     client: '', 
// //     items: [{ productId: '', variantId: '', name: '', quantity: 1, price: 0, taxRate: 0 }],
// //     discount: 0,
// //     shipping: 0,
// //     notes: ''
// //   });

// //   const [totals, setTotals] = useState({ subtotal: 0, taxAmount: 0, totalAmount: 0 });

// //   // 1. Fetch Data for Selectors
// //   useEffect(() => {
// //     const fetchData = async () => {
// //       try {
// //         const [clientRes, productRes] = await Promise.all([
// //           api.get('/clients'),
// //           api.get('/products')
// //         ]);
// //         setDbClients(clientRes.data);
// //         setDbProducts(productRes.data);
// //       } catch (err) {
// //         toast.error("Failed to load clients/products");
// //       }
// //     };
// //     fetchData();
// //   }, []);

// //   // 2. Real-time Calculations
// //   useEffect(() => {
// //     const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
// //     const taxAmount = invoice.items.reduce((acc, item) => {
// //       return acc + (item.quantity * item.price * (item.taxRate / 100));
// //     }, 0);
// //     const totalAmount = (subtotal + taxAmount + Number(invoice.shipping)) - Number(invoice.discount);
// //     setTotals({ subtotal, taxAmount, totalAmount });
// //   }, [invoice]);

// //   // 3. Item Handlers
// //   const addItem = () => {
// //     setInvoice({ 
// //       ...invoice, 
// //       items: [...invoice.items, { productId: '', variantId: '', name: '', quantity: 1, price: 0, taxRate: 0 }] 
// //     });
// //   };

// //   const updateItem = (index, field, value) => {
// //     const newItems = [...invoice.items];
    
// //     // Special logic when selecting a product
// //     if (field === 'productId') {
// //       const selectedProd = dbProducts.find(p => p._id === value);
// //       newItems[index].productId = value;
// //       newItems[index].name = selectedProd?.title || '';
// //       // Default to first variant if exists
// //       if (selectedProd?.variants?.length > 0) {
// //         newItems[index].variantId = selectedProd.variants[0]._id;
// //         newItems[index].price = selectedProd.variants[0].price;
// //       }
// //     } else {
// //       newItems[index][field] = value;
// //     }
    
// //     setInvoice({ ...invoice, items: newItems });
// //   };

// //   // 4. Save to Cloud
// //   const handleSave = async () => {
// //     try {
// //       if (!invoice.client) return toast.error("Please select a client");
// //       if (!invoice.dueDate) return toast.error("Please select a due date");

// //       const payload = {
// //         ...invoice,
// //         clientId: invoice.client, // Matching controller expectation
// //         items: invoice.items.map(item => ({
// //           ...item,
// //           productId: item.productId,
// //           variantId: item.variantId
// //         }))
// //       };
      
// //       await api.post('/invoices', payload);
// //       toast.success("🚀 Invoice created & Stock updated!");
// //     } catch (err) {
// //       toast.error(err.response?.data?.message || "Creation Failed");
// //     }
// //   };
// // const printInvoice = async () => {
// //     try {
// //       const { pdf } = await import('@react-pdf/renderer');
// //       const blob = await pdf(
// //         <InvoicePDF data={{ ...invoice, ...totals, symbol }} />
// //       ).toBlob();
// //       const url = URL.createObjectURL(blob);
// //       const win = window.open(url, '_blank');
// //       if (win) {
// //         win.addEventListener('load', () => {
// //           win.focus();
// //           win.print();
// //         });
// //       }
// //     } catch (err) {
// //       toast.error('Print failed: ' + err.message);
// //     }
// //   };
// //   return (
// //     <div className="p-4 md:p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen">
// //       {/* Header */}
// //       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
// //         <div>
// //           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Billing Terminal</h2>
// //           <p className="text-slate-500 font-medium">Enterprise-grade cloud ledger</p>
// //         </div>
        
// //         <div className="flex gap-3">
// //           <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl">
// //             Save to Cloud
// //           </button>
// //           <PDFDownloadLink
// //             document={<InvoicePDF data={{ ...invoice, ...totals, symbol }} />}
// //             fileName={`${invoice.invoiceNumber}.pdf`}
// //             className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all"
// //           >
// //             <FileDown size={18} />
// //           </PDFDownloadLink>
// //           <button
// //             onClick={printInvoice}
// //             className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all"
// //             title="Print Invoice"
// //           >
// //             <Printer size={18} />
// //           </button>
// //         </div>
// //       </div>

// //       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
// //         <div className="lg:col-span-2 space-y-6">
// //           <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
// //             {/* Client & Date Selector */}
// //             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
// //               <div className="space-y-1">
// //                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><User size={12}/> Select Client</label>
// //                 <select 
// //                   className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
// //                   value={invoice.client}
// //                   onChange={(e) => setInvoice({...invoice, client: e.target.value})}
// //                 >
// //                   <option value="">Select a client...</option>
// //                   {dbClients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
// //                 </select>
// //               </div>
// //               <div className="space-y-1">
// //                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Calendar size={12}/> Due Date</label>
// //                 <input 
// //                   type="date" 
// //                   className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
// //                   onChange={(e) => setInvoice({...invoice, dueDate: e.target.value})}
// //                 />
// //               </div>
// //             </div>

// //             {/* Line Items */}
// //             <div className="space-y-4">
// //               {invoice.items.map((item, index) => (
// //                 <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
// //                   <div className="col-span-4">
// //                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Product</label>
// //                     <select 
// //                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none"
// //                       onChange={(e) => updateItem(index, 'productId', e.target.value)}
// //                     >
// //                       <option value="">Choose Product</option>
// //                       {dbProducts.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
// //                     </select>
// //                   </div>
                  
// //                   <div className="col-span-3">
// //                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Variant</label>
// //                     <select 
// //                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none"
// //                       value={item.variantId}
// //                       onChange={(e) => updateItem(index, 'variantId', e.target.value)}
// //                     >
// //                       {dbProducts.find(p => p._id === item.productId)?.variants.map(v => (
// //                         <option key={v._id} value={v._id}>{v.name} (Stock: {v.stock})</option>
// //                       ))}
// //                     </select>
// //                   </div>

// //                   <div className="col-span-1">
// //                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Qty</label>
// //                     <input 
// //                       type="number" 
// //                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none" 
// //                       value={item.quantity}
// //                       onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
// //                     />
// //                   </div>

// //                   <div className="col-span-2">
// //                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Price</label>
// //                     <input 
// //                       type="number" 
// //                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none" 
// //                       value={item.price}
// //                       onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
// //                     />
// //                   </div>

// //                   <div className="col-span-2 flex items-end justify-center pb-2">
// //                     <button onClick={() => setInvoice({ ...invoice, items: invoice.items.filter((_, i) => i !== index) })} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
// //                       <Trash2 size={18} />
// //                     </button>
// //                   </div>
// //                 </div>
// //               ))}
              
// //               <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black text-xs uppercase hover:border-blue-400 hover:text-blue-500 transition-all">
// //                 <Plus size={16} /> Add Product
// //               </button>
// //             </div>
// //           </div>
// //         </div>

// //         {/* Sidebar Summary */}
// //         <div className="space-y-6">
// //           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
// //             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Financial Summary</h3>
// //             <div className="space-y-4 mb-8">
// //               <div className="flex justify-between text-sm font-bold">
// //                 <span className="text-slate-400">Subtotal</span>
// //                 <span>{symbol}{totals.subtotal.toLocaleString()}</span>
// //               </div>
// //               <div className="flex justify-between text-sm font-bold">
// //                 <span className="text-slate-400">Tax</span>
// //                 <span>{symbol}{totals.taxAmount.toLocaleString()}</span>
// //               </div>
// //             </div>
// //             <div className="pt-6 border-t-4 border-double border-slate-800">
// //               <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Total Payable</p>
// //               <p className="text-4xl font-black">{symbol}{totals.totalAmount.toLocaleString()}</p>
// //             </div>
// //           </div>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default CreateInvoice;
// import React, { useState, useEffect, useContext } from 'react';
// import { PDFDownloadLink } from '@react-pdf/renderer';
// import InvoicePDF from './InvoicePDF';
// import api from '../utils/api'; // Ensure this is imported
// import { toast } from 'react-toastify';
// import { 
//   FileDown, Plus, Trash2, Receipt, Truck, Percent, 
//   Calendar, User, Hash, Info, Package, Printer
// } from 'lucide-react';
// import { CurrencyContext } from '../context/CurrencyContext';

// const CreateInvoice = () => {
//   const { symbol } = useContext(CurrencyContext);
  
//   const [dbClients, setDbClients] = useState([]);
//   const [dbProducts, setDbProducts] = useState([]);
//   const [sellerState, setSellerState] = useState('');

//   const [invoice, setInvoice] = useState({
//     invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
//     poNumber: '',
//     date: new Date().toISOString().split('T')[0],
//     dueDate: '',
//     client: '',
//     items: [{ productId: '', variantId: '', name: '', quantity: 1, price: 0, taxRate: 0 }],
//     discount: 0,
//     shipping: 0,
//     notes: ''
//   });

//   const [totals, setTotals] = useState({ subtotal: 0, taxAmount: 0, totalAmount: 0, cgst: 0, sgst: 0, igst: 0, gstType: 'none' });

//   // 1. Fetch Data for Selectors + seller state
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [clientRes, productRes, profileRes] = await Promise.all([
//           api.get('/clients'),
//           api.get('/products'),
//           api.get('/auth/profile')
//         ]);
//         setDbClients(clientRes.data);
//         setDbProducts(productRes.data);
//         setSellerState(profileRes.data.state || '');
//       } catch (err) {
//         toast.error("Failed to load clients/products");
//       }
//     };
//     fetchData();
//   }, []);

//   // 2. Real-time Calculations with GST split
//   useEffect(() => {
//     const subtotal = invoice.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
//     const taxAmount = invoice.items.reduce((acc, item) => {
//       return acc + (item.quantity * item.price * (item.taxRate / 100));
//     }, 0);
//     const totalAmount = (subtotal + taxAmount + Number(invoice.shipping)) - Number(invoice.discount);

//     // Determine buyer state from selected client
//     const selectedClient = dbClients.find(c => c._id === invoice.client);
//     const buyerState = selectedClient?.billingAddress?.state || '';

//     let gstType = 'none';
//     let cgst = 0, sgst = 0, igst = 0;

//     if (sellerState && buyerState) {
//       if (sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase()) {
//         gstType = 'intra';
//         cgst = Number((taxAmount / 2).toFixed(2));
//         sgst = Number((taxAmount / 2).toFixed(2));
//         igst = 0;
//       } else {
//         gstType = 'inter';
//         cgst = 0;
//         sgst = 0;
//         igst = Number(taxAmount.toFixed(2));
//       }
//     }

//     setTotals({ subtotal, taxAmount, totalAmount, cgst, sgst, igst, gstType });
//   }, [invoice, sellerState, dbClients]);

//   // 3. Item Handlers
//   const addItem = () => {
//     setInvoice({ 
//       ...invoice, 
//       items: [...invoice.items, { productId: '', variantId: '', name: '', quantity: 1, price: 0, taxRate: 0 }] 
//     });
//   };

//   const updateItem = (index, field, value) => {
//     const newItems = [...invoice.items];
    
//     // Special logic when selecting a product
//     if (field === 'productId') {
//       const selectedProd = dbProducts.find(p => p._id === value);
//       newItems[index].productId = value;
//       newItems[index].name = selectedProd?.title || '';
//       // Default to first variant if exists
//       if (selectedProd?.variants?.length > 0) {
//         newItems[index].variantId = selectedProd.variants[0]._id;
//         newItems[index].price = selectedProd.variants[0].price;
//       }
//     } else {
//       newItems[index][field] = value;
//     }
    
//     setInvoice({ ...invoice, items: newItems });
//   };

//   const handleSave = async () => {
//     try {
//       if (!invoice.client) return toast.error("Please select a client");
//       if (!invoice.dueDate) return toast.error("Please select a due date");

//       const selectedClient = dbClients.find(c => c._id === invoice.client);
//       const buyerState = selectedClient?.billingAddress?.state || '';

//       const payload = {
//         ...invoice,
//         clientId: invoice.client,
//         gstType: totals.gstType,
//         sellerState,
//         buyerState,
//         items: invoice.items.map(item => ({
//           ...item,
//           productId: item.productId,
//           variantId: item.variantId
//         }))
//       };
      
//       await api.post('/invoices', payload);
//       toast.success("🚀 Invoice created & Stock updated!");
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Creation Failed");
//     }
//   };
// const printInvoice = async () => {
//     try {
//       const { pdf } = await import('@react-pdf/renderer');
//       const selectedClient = dbClients.find(c => c._id === invoice.client);
//       const pdfData = {
//         ...invoice,
//         ...totals,
//         symbol,
//         sellerState,
//         buyerState: selectedClient?.billingAddress?.state || '',
//         clientName: selectedClient?.name || '',
//         clientEmail: selectedClient?.email || '',
//         clientPhone: selectedClient?.phone || '',
//         clientAddress: selectedClient?.billingAddress
//           ? `${selectedClient.billingAddress.street || ''}, ${selectedClient.billingAddress.city || ''}, ${selectedClient.billingAddress.state || ''} ${selectedClient.billingAddress.zip || ''}`.replace(/^,\s*/, '')
//           : '',
//         clientGstin: selectedClient?.taxId || '',
//         dbProducts,
//       };
//       const blob = await pdf(<InvoicePDF data={pdfData} />).toBlob();
//       const url = URL.createObjectURL(blob);
//       const win = window.open(url, '_blank');
//       if (win) {
//         win.addEventListener('load', () => { win.focus(); win.print(); });
//       }
//     } catch (err) {
//       toast.error('Print failed: ' + err.message);
//     }
//   };
//   return (
//     <div className="p-4 md:p-8 max-w-5xl mx-auto bg-slate-50 min-h-screen">
//       {/* Header */}
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
//         <div>
//           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Billing Terminal</h2>
//           <p className="text-slate-500 font-medium">Enterprise-grade cloud ledger</p>
//         </div>
        
//         <div className="flex gap-3">
//           <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl">
//             Save to Cloud
//           </button>
//           <PDFDownloadLink
//             document={<InvoicePDF data={{ ...invoice, ...totals, symbol }} />}
//             fileName={`${invoice.invoiceNumber}.pdf`}
//             className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all"
//           >
//             <FileDown size={18} />
//           </PDFDownloadLink>
//           <button
//             onClick={printInvoice}
//             className="bg-white text-slate-900 px-6 py-4 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all"
//             title="Print Invoice"
//           >
//             <Printer size={18} />
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         <div className="lg:col-span-2 space-y-6">
//           <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
//             {/* Client & Date Selector */}
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
//               <div className="space-y-1">
//                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><User size={12}/> Select Client</label>
//                 <select 
//                   className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
//                   value={invoice.client}
//                   onChange={(e) => setInvoice({...invoice, client: e.target.value})}
//                 >
//                   <option value="">Select a client...</option>
//                   {dbClients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
//                 </select>
//               </div>
//               <div className="space-y-1">
//                 <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1"><Calendar size={12}/> Due Date</label>
//                 <input 
//                   type="date" 
//                   className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
//                   onChange={(e) => setInvoice({...invoice, dueDate: e.target.value})}
//                 />
//               </div>
//             </div>

//             {/* Line Items */}
//             <div className="space-y-4">
//               {invoice.items.map((item, index) => (
//                 <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
//                   <div className="col-span-4">
//                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Product</label>
//                     <select 
//                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none"
//                       onChange={(e) => updateItem(index, 'productId', e.target.value)}
//                     >
//                       <option value="">Choose Product</option>
//                       {dbProducts.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
//                     </select>
//                   </div>
                  
//                   <div className="col-span-3">
//                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Variant</label>
//                     <select 
//                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none"
//                       value={item.variantId}
//                       onChange={(e) => updateItem(index, 'variantId', e.target.value)}
//                     >
//                       {dbProducts.find(p => p._id === item.productId)?.variants.map(v => (
//                         <option key={v._id} value={v._id}>{v.name} (Stock: {v.stock})</option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="col-span-1">
//                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Qty</label>
//                     <input 
//                       type="number" 
//                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none" 
//                       value={item.quantity}
//                       onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
//                     />
//                   </div>

//                   <div className="col-span-2">
//                     <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Price</label>
//                     <input 
//                       type="number" 
//                       className="w-full p-2 bg-white rounded-xl text-sm font-bold outline-none" 
//                       value={item.price}
//                       onChange={(e) => updateItem(index, 'price', Number(e.target.value))}
//                     />
//                   </div>

//                   <div className="col-span-2 flex items-end justify-center pb-2">
//                     <button onClick={() => setInvoice({ ...invoice, items: invoice.items.filter((_, i) => i !== index) })} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">
//                       <Trash2 size={18} />
//                     </button>
//                   </div>
//                 </div>
//               ))}
              
//               <button onClick={addItem} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black text-xs uppercase hover:border-blue-400 hover:text-blue-500 transition-all">
//                 <Plus size={16} /> Add Product
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Sidebar Summary */}
//         <div className="space-y-6">
//           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl">
//             <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Financial Summary</h3>
//             <div className="space-y-4 mb-8">
//               <div className="flex justify-between text-sm font-bold">
//                 <span className="text-slate-400">Subtotal</span>
//                 <span>{symbol}{totals.subtotal.toLocaleString()}</span>
//               </div>

//               {/* GST Breakdown */}
//               {totals.gstType === 'intra' && (
//                 <>
//                   <div className="flex justify-between text-sm font-bold">
//                     <span className="text-emerald-400">CGST</span>
//                     <span className="text-emerald-300">{symbol}{totals.cgst.toFixed(2)}</span>
//                   </div>
//                   <div className="flex justify-between text-sm font-bold">
//                     <span className="text-emerald-400">SGST</span>
//                     <span className="text-emerald-300">{symbol}{totals.sgst.toFixed(2)}</span>
//                   </div>
//                   <div className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest -mt-2">
//                     Intra-State Supply
//                   </div>
//                 </>
//               )}
//               {totals.gstType === 'inter' && (
//                 <>
//                   <div className="flex justify-between text-sm font-bold">
//                     <span className="text-amber-400">IGST</span>
//                     <span className="text-amber-300">{symbol}{totals.igst.toFixed(2)}</span>
//                   </div>
//                   <div className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest -mt-2">
//                     Inter-State Supply
//                   </div>
//                 </>
//               )}
//               {totals.gstType === 'none' && (
//                 <div className="flex justify-between text-sm font-bold">
//                   <span className="text-slate-400">Tax</span>
//                   <span>{symbol}{totals.taxAmount.toFixed(2)}</span>
//                 </div>
//               )}

//               {/* State info */}
//               {(sellerState || (() => { const c = dbClients.find(cl => cl._id === invoice.client); return c?.billingAddress?.state; })()) && (
//                 <div className="bg-slate-800 rounded-2xl p-3 space-y-1">
//                   <div className="flex justify-between text-[10px] font-bold text-slate-400">
//                     <span>Seller State</span>
//                     <span className="text-slate-300">{sellerState || '—'}</span>
//                   </div>
//                   <div className="flex justify-between text-[10px] font-bold text-slate-400">
//                     <span>Buyer State</span>
//                     <span className="text-slate-300">
//                       {(() => { const c = dbClients.find(cl => cl._id === invoice.client); return c?.billingAddress?.state || '—'; })()}
//                     </span>
//                   </div>
//                 </div>
//               )}
//             </div>
//             <div className="pt-6 border-t-4 border-double border-slate-800">
//               <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Total Payable</p>
//               <p className="text-4xl font-black">{symbol}{totals.totalAmount.toLocaleString()}</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CreateInvoice;
import React, { useState, useEffect, useContext } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from './InvoicePDF';
import api from '../utils/api';
import { toast } from 'react-toastify';
import {
  FileDown, Plus, Trash2, Calendar, User, Printer,
  Hash, Info, ChevronDown, ChevronUp, MapPin, Building2
} from 'lucide-react';
import { CurrencyContext } from '../context/CurrencyContext';
import { searchHSN } from '../utils/hsnCodes';

const CreateInvoice = () => {
  const { symbol } = useContext(CurrencyContext);

  const [dbClients, setDbClients]   = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [sellerState, setSellerState] = useState('');
  const [profile, setProfile]         = useState({});

  // HSN dropdown state per item index
  const [hsnQuery, setHsnQuery]           = useState({});
  const [hsnResults, setHsnResults]       = useState({});
  const [showHsnDrop, setShowHsnDrop]     = useState({});

  const [invoice, setInvoice] = useState({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTerms: 'Due on Receipt',
    client: '',
    notes: '',
    discount: 0,
    shipping: 0,
    items: [{
      productId: '', variantId: '', name: '',
      hsnCode: '', quantity: 1, price: 0, taxRate: 0
    }],
  });

  const [totals, setTotals] = useState({
    subtotal: 0, taxAmount: 0, totalAmount: 0,
    cgst: 0, sgst: 0, igst: 0, gstType: 'none'
  });

  // ── Fetch data ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [cr, pr, prof] = await Promise.all([
          api.get('/clients'),
          api.get('/products'),
          api.get('/auth/profile'),
        ]);
        setDbClients(cr.data);
        setDbProducts(pr.data);
        setProfile(prof.data);
        setSellerState(prof.data.state || '');
      } catch {
        toast.error('Failed to load data');
      }
    };
    load();
  }, []);

  // ── Calculate totals ──────────────────────────────────────────────
  useEffect(() => {
    const subtotal   = invoice.items.reduce((a, i) => a + i.quantity * i.price, 0);
    const taxAmount  = invoice.items.reduce((a, i) => a + (i.quantity * i.price * (i.taxRate / 100)), 0);
    const totalAmount = (subtotal + taxAmount + Number(invoice.shipping || 0)) - Number(invoice.discount || 0);

    const client    = dbClients.find(c => c._id === invoice.client);
    const buyerState = client?.billingAddress?.state || '';

    let gstType = 'none', cgst = 0, sgst = 0, igst = 0;
    if (sellerState && buyerState) {
      if (sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase()) {
        gstType = 'intra';
        cgst = sgst = Number((taxAmount / 2).toFixed(2));
      } else {
        gstType = 'inter';
        igst = Number(taxAmount.toFixed(2));
      }
    }
    setTotals({ subtotal, taxAmount, totalAmount, cgst, sgst, igst, gstType });
  }, [invoice, sellerState, dbClients]);

  // ── Item helpers ──────────────────────────────────────────────────
  const addItem = () => setInvoice(prev => ({
    ...prev,
    items: [...prev.items, { productId: '', variantId: '', name: '', hsnCode: '', quantity: 1, price: 0, taxRate: 0 }]
  }));

  const removeItem = (idx) => setInvoice(prev => ({
    ...prev, items: prev.items.filter((_, i) => i !== idx)
  }));

  const updateItem = (idx, field, value) => {
    const items = [...invoice.items];
    if (field === 'productId') {
      const prod = dbProducts.find(p => p._id === value);
      items[idx] = {
        ...items[idx],
        productId: value,
        name: prod?.title || '',
        hsnCode: prod?.hsnCode || '',
        taxRate: prod?.variants?.[0]?.taxRate || 0,
        price: prod?.variants?.[0]?.price || 0,
        variantId: prod?.variants?.[0]?._id || '',
      };
      // Sync HSN query display
      if (prod?.hsnCode) {
        setHsnQuery(prev => ({ ...prev, [idx]: prod.hsnCode }));
      }
    } else if (field === 'variantId') {
      const prod = dbProducts.find(p => p._id === items[idx].productId);
      const v    = prod?.variants?.find(v => v._id === value);
      items[idx] = { ...items[idx], variantId: value, price: v?.price || 0, taxRate: v?.taxRate || items[idx].taxRate };
    } else {
      items[idx][field] = value;
    }
    setInvoice(prev => ({ ...prev, items }));
  };

  // ── HSN search handlers ───────────────────────────────────────────
  const handleHsnInput = (idx, val) => {
    setHsnQuery(prev => ({ ...prev, [idx]: val }));
    updateItem(idx, 'hsnCode', val);
    if (val.trim().length >= 2) {
      setHsnResults(prev => ({ ...prev, [idx]: searchHSN(val) }));
      setShowHsnDrop(prev => ({ ...prev, [idx]: true }));
    } else {
      setShowHsnDrop(prev => ({ ...prev, [idx]: false }));
    }
  };

  const selectHsn = (idx, item) => {
    setHsnQuery(prev => ({ ...prev, [idx]: `${item.code}` }));
    updateItem(idx, 'hsnCode', item.code);
    setShowHsnDrop(prev => ({ ...prev, [idx]: false }));
  };

  // ── Save ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!invoice.client)  return toast.error('Please select a client');
    if (!invoice.dueDate) return toast.error('Please select a due date');
    try {
      const client    = dbClients.find(c => c._id === invoice.client);
      const buyerState = client?.billingAddress?.state || '';
      await api.post('/invoices', {
        ...invoice,
        clientId: invoice.client,
        gstType: totals.gstType,
        sellerState, buyerState,
      });
      toast.success('🚀 Invoice saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  // ── PDF data builder ──────────────────────────────────────────────
  const buildPdfData = () => {
    const client     = dbClients.find(c => c._id === invoice.client);
    const addr       = client?.billingAddress || {};
    return {
      ...invoice, ...totals, symbol,
      businessName:    profile.businessName    || '',
      businessAddress: profile.businessAddress || '',
      state:           profile.state           || '',
      gstNumber:       profile.gstNumber       || '',
      senderEmail:     profile.email           || '',
      phone:           profile.phone           || '',
      logo:            profile.logo            || null,
      sellerState,
      buyerState:      addr.state              || '',
      clientName:      client?.name            || '',
      clientEmail:     client?.email           || '',
      clientPhone:     client?.phone           || '',
      clientAddress:   [addr.street, addr.city, addr.zip].filter(Boolean).join(', '),
      clientGstin:     client?.taxId           || '',
      dbProducts,
    };
  };

  const handlePrint = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const blob = await pdf(<InvoicePDF data={buildPdfData()} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const win  = window.open(url, '_blank');
      if (win) win.addEventListener('load', () => { win.focus(); win.print(); });
    } catch (err) {
      toast.error('Print failed: ' + err.message);
    }
  };

  const selectedClient = dbClients.find(c => c._id === invoice.client);
  const buyerState     = selectedClient?.billingAddress?.state || '';
  const fmt = (n) => `${symbol}${Number(n || 0).toFixed(2)}`;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 min-h-screen">

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Invoice</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">GST-compliant billing with auto CGST / SGST / IGST</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleSave}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl">
            Save Invoice
          </button>
          <PDFDownloadLink
            document={<InvoicePDF data={buildPdfData()} />}
            fileName={`${invoice.invoiceNumber}.pdf`}
            className="bg-white text-slate-900 px-5 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <FileDown size={16} /> Export PDF
          </PDFDownloadLink>
          <button onClick={handlePrint}
            className="bg-white text-slate-700 px-5 py-3 rounded-2xl font-black text-xs uppercase border border-slate-200 flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: main form ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Invoice Meta */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Invoice No.</label>
                <input
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-black text-sm text-slate-700"
                  value={invoice.invoiceNumber}
                  onChange={e => setInvoice(p => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block flex items-center gap-1"><Calendar size={10}/> Date</label>
                <input type="date"
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  value={invoice.date}
                  onChange={e => setInvoice(p => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Due Date</label>
                <input type="date"
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  onChange={e => setInvoice(p => ({ ...p, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">PO Number (optional)</label>
                <input
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm"
                  placeholder="PO-XXXXX"
                  value={invoice.poNumber}
                  onChange={e => setInvoice(p => ({ ...p, poNumber: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Payment Terms</label>
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm cursor-pointer"
                  value={invoice.paymentTerms}
                  onChange={e => setInvoice(p => ({ ...p, paymentTerms: e.target.value }))}
                >
                  <option>Due on Receipt</option>
                  <option>Net 7</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                </select>
              </div>
            </div>
          </div>

          {/* Client + GST Info */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
              <User size={11}/> Bill To
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Select Client</label>
                <select
                  className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm cursor-pointer"
                  value={invoice.client}
                  onChange={e => setInvoice(p => ({ ...p, client: e.target.value }))}
                >
                  <option value="">Choose a client...</option>
                  {dbClients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              {/* Show client details + state when selected */}
              {selectedClient && (
                <div className="bg-slate-50 rounded-2xl p-4 text-sm space-y-1">
                  <p className="font-black text-slate-800">{selectedClient.name}</p>
                  {selectedClient.email && <p className="text-slate-500 text-xs">{selectedClient.email}</p>}
                  {selectedClient.billingAddress?.city && (
                    <p className="text-slate-500 text-xs flex items-center gap-1">
                      <MapPin size={10}/>
                      {[selectedClient.billingAddress.city, selectedClient.billingAddress.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {selectedClient.taxId && (
                    <p className="text-xs font-black text-indigo-600 mt-1">GSTIN: {selectedClient.taxId}</p>
                  )}
                  {!buyerState && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1">
                      ⚠ No state set — GST type cannot be determined. Edit client to add billing state.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* GST Type indicator */}
            {sellerState && buyerState && (
              <div className={`mt-4 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold
                ${totals.gstType === 'intra' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <Building2 size={14}/>
                {totals.gstType === 'intra'
                  ? `Intra-State Supply — CGST + SGST applies (${sellerState})`
                  : `Inter-State Supply — IGST applies (${sellerState} → ${buyerState})`}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Line Items</h3>

            <div className="space-y-4">
              {invoice.items.map((item, idx) => {
                const prod = dbProducts.find(p => p._id === item.productId);
                const lineTotal = item.quantity * item.price;
                const lineTax   = lineTotal * (item.taxRate / 100);
                const halfTax   = lineTax / 2;

                return (
                  <div key={idx} className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-slate-50/30">

                    {/* Row 1: Product + Variant */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Product</label>
                        <select
                          className="w-full p-2.5 bg-white rounded-xl text-sm font-bold outline-none border border-slate-200"
                          value={item.productId}
                          onChange={e => updateItem(idx, 'productId', e.target.value)}
                        >
                          <option value="">Choose product...</option>
                          {dbProducts.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Variant</label>
                        <select
                          className="w-full p-2.5 bg-white rounded-xl text-sm font-bold outline-none border border-slate-200"
                          value={item.variantId}
                          onChange={e => updateItem(idx, 'variantId', e.target.value)}
                          disabled={!item.productId}
                        >
                          {(prod?.variants || []).map(v => (
                            <option key={v._id} value={v._id}>{v.name} (Stock: {v.stock})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Row 2: HSN search */}
                    <div className="relative">
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                        <Hash size={9}/> HSN / SAC Code
                        {!item.hsnCode && (
                          <span className="text-amber-500 font-bold normal-case ml-1">— not set, type to search or enter manually</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={hsnQuery[idx] ?? item.hsnCode}
                          onChange={e => handleHsnInput(idx, e.target.value)}
                          onFocus={() => { if ((hsnQuery[idx] || item.hsnCode || '').length >= 2) setShowHsnDrop(p => ({...p, [idx]: true})); }}
                          onBlur={() => setTimeout(() => setShowHsnDrop(p => ({...p, [idx]: false})), 180)}
                          placeholder="Type code or product name (e.g. 8471, mobile, cotton)..."
                          className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none"
                          autoComplete="off"
                        />
                        {item.hsnCode && (
                          <span className="flex items-center bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 rounded-xl border border-indigo-100 whitespace-nowrap">
                            {item.hsnCode}
                          </span>
                        )}
                      </div>

                      {/* HSN Dropdown */}
                      {showHsnDrop[idx] && (hsnResults[idx] || []).length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                          {(hsnResults[idx] || []).map((h, i) => (
                            <button
                              key={i} type="button"
                              onMouseDown={() => selectHsn(idx, h)}
                              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 flex gap-3 items-center border-b border-slate-50 last:border-0"
                            >
                              <span className="text-[10px] font-black text-indigo-600 w-14 shrink-0">{h.code}</span>
                              <span className="text-[10px] text-slate-600 font-medium truncate">{h.description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Row 3: Qty, Price, Tax */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Qty</label>
                        <input type="number" min="1"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none text-center"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Rate ({symbol})</label>
                        <input type="number" min="0" step="0.01"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          value={item.price}
                          onChange={e => updateItem(idx, 'price', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">Tax %</label>
                        <input type="number" min="0" max="100" step="0.1"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none"
                          value={item.taxRate}
                          onChange={e => updateItem(idx, 'taxRate', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Row 4: GST breakdown per line */}
                    {lineTotal > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold">
                          Taxable: <span className="text-slate-700">{fmt(lineTotal)}</span>
                        </span>
                        {totals.gstType === 'intra' ? (
                          <>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-lg">
                              CGST {item.taxRate/2}% = {fmt(halfTax)}
                            </span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-lg">
                              SGST {item.taxRate/2}% = {fmt(halfTax)}
                            </span>
                          </>
                        ) : totals.gstType === 'inter' ? (
                          <span className="text-[10px] bg-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-lg">
                            IGST {item.taxRate}% = {fmt(lineTax)}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded-lg">
                            Tax {item.taxRate}% = {fmt(lineTax)}
                          </span>
                        )}
                        <span className="ml-auto text-sm font-black text-slate-800">
                          {fmt(lineTotal + lineTax)}
                        </span>
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-rose-400 hover:bg-rose-50 p-1 rounded-lg transition-colors ml-1">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    )}
                    {lineTotal === 0 && (
                      <div className="flex justify-end">
                        <button type="button" onClick={() => removeItem(idx)}
                          className="text-rose-400 hover:bg-rose-50 p-1 rounded-lg transition-colors">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              <button onClick={addItem}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-400 font-black text-xs uppercase hover:border-indigo-400 hover:text-indigo-500 transition-all">
                <Plus size={14}/> Add Line Item
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Notes / Terms & Conditions</label>
            <textarea rows={3}
              className="w-full p-3 bg-slate-50 rounded-xl outline-none text-sm font-medium text-slate-700 resize-none"
              placeholder="Payment instructions, terms, thank you note..."
              value={invoice.notes}
              onChange={e => setInvoice(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>

        {/* ── Right: Summary sidebar ── */}
        <div className="space-y-5">

          {/* Financial Summary */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Summary</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Subtotal</span>
                <span>{fmt(totals.subtotal)}</span>
              </div>

              {/* GST breakdown */}
              {totals.gstType === 'intra' && (
                <>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-emerald-400">CGST</span>
                    <span className="text-emerald-300">{fmt(totals.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-emerald-400">SGST</span>
                    <span className="text-emerald-300">{fmt(totals.sgst)}</span>
                  </div>
                  <div className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Intra-State Supply</div>
                </>
              )}
              {totals.gstType === 'inter' && (
                <>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-amber-400">IGST</span>
                    <span className="text-amber-300">{fmt(totals.igst)}</span>
                  </div>
                  <div className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest">Inter-State Supply</div>
                </>
              )}
              {totals.gstType === 'none' && totals.taxAmount > 0 && (
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-slate-400">Tax</span>
                  <span>{fmt(totals.taxAmount)}</span>
                </div>
              )}

              {/* States */}
              {(sellerState || buyerState) && (
                <div className="bg-slate-800 rounded-xl p-3 space-y-1.5 text-[10px] font-bold">
                  <div className="flex justify-between text-slate-400">
                    <span>Seller State</span>
                    <span className="text-slate-300">{sellerState || '—'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Buyer State</span>
                    <span className="text-slate-300">{buyerState || '—'}</span>
                  </div>
                </div>
              )}

              {/* Discount & Shipping */}
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-xs">{symbol}</span>
                  <input type="number" min="0"
                    className="w-20 bg-slate-800 rounded-lg px-2 py-1 text-right text-xs font-black outline-none"
                    value={invoice.discount}
                    onChange={e => setInvoice(p => ({ ...p, discount: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-400">Shipping</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 text-xs">{symbol}</span>
                  <input type="number" min="0"
                    className="w-20 bg-slate-800 rounded-lg px-2 py-1 text-right text-xs font-black outline-none"
                    value={invoice.shipping}
                    onChange={e => setInvoice(p => ({ ...p, shipping: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div className="pt-5 border-t-2 border-slate-800">
              <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Total Payable</p>
              <p className="text-4xl font-black">{fmt(totals.totalAmount)}</p>
            </div>
          </div>

          {/* Items HSN summary */}
          {invoice.items.some(i => i.name) && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">HSN Summary</h4>
              <div className="space-y-2">
                {invoice.items.filter(i => i.name).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold truncate max-w-[140px]">{item.name}</span>
                    {item.hsnCode
                      ? <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg">{item.hsnCode}</span>
                      : <span className="text-[10px] text-amber-500 font-bold">No HSN</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller info */}
          {profile.businessName && (
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 text-xs space-y-1">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">From</h4>
              <p className="font-black text-slate-800">{profile.businessName}</p>
              {profile.businessAddress && <p className="text-slate-500">{profile.businessAddress}</p>}
              {profile.state && <p className="text-slate-500">{profile.state}</p>}
              {profile.gstNumber && <p className="text-indigo-600 font-bold">GSTIN: {profile.gstNumber}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateInvoice;
