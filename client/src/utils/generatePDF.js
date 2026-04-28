// // import jsPDF from 'jspdf';
// // import 'jspdf-autotable';

// // export const generateInvoicePDF = (invoice) => {
// //   const doc = new jsPDF();
  
// //   // -- Header --
// //   doc.setFontSize(20);
// //   doc.setTextColor(34, 197, 94); // Your Green Color
// //   doc.text('ACCOUNTGO', 14, 22);
  
// //   doc.setFontSize(10);
// //   doc.setTextColor(100);
// //   doc.text('Professional Business Invoice', 14, 28);
  
// //   // -- Invoice Details --
// //   doc.setTextColor(0);
// //   doc.setFontSize(12);
// //   doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 22);
// //   doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 28);
// //   doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 140, 34);

// //   // -- Bill To --
// //   doc.setFontSize(10);
// //   doc.setTextColor(100);
// //   doc.text('BILL TO:', 14, 50);
// //   doc.setFontSize(12);
// //   doc.setTextColor(0);
// //   doc.text(invoice.customerName, 14, 56);

// //   // -- Table --
// //   doc.autoTable({
// //     startY: 70,
// //     head: [['Description', 'Status', 'Total']],
// //     body: [
// //       ['Service/Product Consultation', invoice.status, `$${invoice.amount.toLocaleString()}`]
// //     ],
// //     headStyles: { fillColor: [34, 197, 94] }, // Green header
// //     theme: 'striped'
// //   });

// //   // -- Footer --
// //   const finalY = doc.lastAutoTable.finalY + 10;
// //   doc.setFontSize(14);
// //   doc.text(`Total Amount: $${invoice.amount.toLocaleString()}`, 14, finalY + 10);
  
// //   doc.setFontSize(10);
// //   doc.setTextColor(150);
// //   doc.text('Thank you for your business!', 14, doc.internal.pageSize.height - 20);

// //   // -- Download --
// //   doc.save(`${invoice.invoiceNumber}.pdf`);
// // };
// import React from 'react';
// import { pdf } from '@react-pdf/renderer';
// import InvoicePDF from '../components/InvoicePDF';
// import api from './api';

// export const generateInvoicePDF = async (invoice, options = {}) => {
//   try {
//     // Fetch seller profile for business info
//     let profile = options.profile || {};
//     if (!options.profile) {
//       try {
//         const res = await api.get('/auth/profile');
//         profile = res.data;
//       } catch (_) {}
//     }

//     // Fetch products list for HSN codes
//     let dbProducts = options.dbProducts || [];
//     if (!options.dbProducts) {
//       try {
//         const res = await api.get('/products');
//         dbProducts = res.data;
//       } catch (_) {}
//     }

//     const sym = options.symbol || profile.currency === 'INR' ? '₹'
//       : profile.currency === 'USD' ? '$'
//       : profile.currency === 'EUR' ? '€'
//       : profile.currency === 'GBP' ? '£' : '₹';

//     const client = invoice.clientId || {};
//     const billingAddr = client.billingAddress || {};

//     const data = {
//       // Business (Seller)
//       businessName:    profile.businessName  || 'Your Business',
//       companyName:     profile.companyName   || '',
//       businessAddress: profile.businessAddress || '',
//       state:           profile.state          || invoice.sellerState || '',
//       gstNumber:       profile.gstNumber      || '',
//       senderEmail:     profile.email          || '',
//       phone:           profile.phone          || '',
//       logo:            profile.logo           || null,

//       // Invoice metadata
//       invoiceNumber: invoice.invoiceNumber || invoice._id?.slice(-6) || '',
//       poNumber:      invoice.poNumber     || '',
//       date:          invoice.date
//         ? new Date(invoice.date).toLocaleDateString('en-IN')
//         : '',
//       dueDate:       invoice.dueDate
//         ? new Date(invoice.dueDate).toLocaleDateString('en-IN')
//         : '',
//       notes:         invoice.notes || '',

//       // Client (Buyer)
//       clientName:    client.name || invoice.customerName || '',
//       clientEmail:   client.email || '',
//       clientPhone:   client.phone || '',
//       clientAddress: [
//         billingAddr.street,
//         billingAddr.city,
//         billingAddr.zip
//       ].filter(Boolean).join(', '),
//       buyerState:    billingAddr.state || invoice.buyerState || '',
//       clientGstin:   client.taxId || '',

//       // Items
//       items: (invoice.items || []).map(item => ({
//         ...item,
//         hsnCode: item.hsnCode || '',
//       })),
//       dbProducts,

//       // Financials
//       subtotal:    invoice.subtotal    || 0,
//       taxAmount:   invoice.taxAmount   || 0,
//       discount:    invoice.discount    || 0,
//       shipping:    invoice.shipping    || 0,
//       totalAmount: invoice.totalAmount || invoice.total || 0,

//       // GST
//       gstType:     invoice.gstType    || 'none',
//       cgst:        invoice.cgst       || 0,
//       sgst:        invoice.sgst       || 0,
//       igst:        invoice.igst       || 0,
//       sellerState: profile.state      || invoice.sellerState || '',

//       symbol: sym,
//     };

//     const blob = await pdf(<InvoicePDF data={data} />).toBlob();
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement('a');
//     a.href     = url;
//     a.download = `Invoice-${data.invoiceNumber || 'download'}.pdf`;
//     a.click();
//     URL.revokeObjectURL(url);
//   } catch (err) {
//     console.error('PDF generation failed:', err);
//     throw err;
//   }
// };

// export const printInvoicePDF = async (invoice, options = {}) => {
//   try {
//     let profile = options.profile || {};
//     if (!options.profile) {
//       try { const res = await api.get('/auth/profile'); profile = res.data; } catch (_) {}
//     }
//     let dbProducts = options.dbProducts || [];
//     if (!options.dbProducts) {
//       try { const res = await api.get('/products'); dbProducts = res.data; } catch (_) {}
//     }

//     const sym = options.symbol || '₹';
//     const client = invoice.clientId || {};
//     const billingAddr = client.billingAddress || {};

//     const data = {
//       businessName:    profile.businessName  || 'Your Business',
//       businessAddress: profile.businessAddress || '',
//       state:           profile.state          || invoice.sellerState || '',
//       gstNumber:       profile.gstNumber      || '',
//       senderEmail:     profile.email          || '',
//       phone:           profile.phone          || '',
//       logo:            profile.logo           || null,
//       invoiceNumber:   invoice.invoiceNumber  || '',
//       poNumber:        invoice.poNumber       || '',
//       date:   invoice.date    ? new Date(invoice.date).toLocaleDateString('en-IN')    : '',
//       dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '',
//       notes:  invoice.notes   || '',
//       clientName:    client.name || '',
//       clientEmail:   client.email || '',
//       clientPhone:   client.phone || '',
//       clientAddress: [billingAddr.street, billingAddr.city, billingAddr.zip].filter(Boolean).join(', '),
//       buyerState:    billingAddr.state || invoice.buyerState || '',
//       clientGstin:   client.taxId || '',
//       items:         (invoice.items || []).map(item => ({ ...item })),
//       dbProducts,
//       subtotal:    invoice.subtotal    || 0,
//       taxAmount:   invoice.taxAmount   || 0,
//       discount:    invoice.discount    || 0,
//       shipping:    invoice.shipping    || 0,
//       totalAmount: invoice.totalAmount || 0,
//       gstType:     invoice.gstType    || 'none',
//       cgst:        invoice.cgst       || 0,
//       sgst:        invoice.sgst       || 0,
//       igst:        invoice.igst       || 0,
//       sellerState: profile.state      || invoice.sellerState || '',
//       symbol: sym,
//     };

//     const blob = await pdf(<InvoicePDF data={data} />).toBlob();
//     const url  = URL.createObjectURL(blob);
//     const win  = window.open(url, '_blank');
//     if (win) win.addEventListener('load', () => { win.focus(); win.print(); });
//   } catch (err) {
//     console.error('Print failed:', err);
//     throw err;
//   }
// };
import React from 'react';
import { pdf } from '@react-pdf/renderer';
import InvoicePDF from '../components/InvoicePDF';
import api from './api';

export const generateInvoicePDF = async (invoice, options = {}) => {
  try {
    // Fetch seller profile for business info
    let profile = options.profile || {};
    if (!options.profile) {
      try {
        const res = await api.get('/auth/profile');
        profile = res.data;
      } catch (_) {}
    }

    // Fetch products list for HSN codes
    let dbProducts = options.dbProducts || [];
    if (!options.dbProducts) {
      try {
        const res = await api.get('/products');
        dbProducts = res.data;
      } catch (_) {}
    }

    const sym = options.symbol || profile.currency === 'INR' ? '₹'
      : profile.currency === 'USD' ? '$'
      : profile.currency === 'EUR' ? '€'
      : profile.currency === 'GBP' ? '£' : '₹';

    const client = invoice.clientId || {};
    const billingAddr = client.billingAddress || {};

    const data = {
      // Business (Seller)
      businessName:    profile.businessName  || 'Your Business',
      companyName:     profile.companyName   || '',
      businessAddress: profile.businessAddress || '',
      state:           profile.state          || invoice.sellerState || '',
      gstNumber:       profile.gstNumber      || '',
      senderEmail:     profile.email          || '',
      phone:           profile.phone          || '',
      logo:            profile.logo           || null,

      // Invoice metadata
      invoiceNumber: invoice.invoiceNumber || invoice._id?.slice(-6) || '',
      poNumber:      invoice.poNumber     || '',
      date:          invoice.date
        ? new Date(invoice.date).toLocaleDateString('en-IN')
        : '',
      dueDate:       invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString('en-IN')
        : '',
      notes:         invoice.notes || '',

      // Client (Buyer)
      clientName:    client.name || invoice.customerName || '',
      clientEmail:   client.email || '',
      clientPhone:   client.phone || '',
      clientAddress: [
        billingAddr.street,
        billingAddr.city,
        billingAddr.zip
      ].filter(Boolean).join(', '),
      buyerState:    billingAddr.state || invoice.buyerState || '',
      clientGstin:   client.taxId || '',

      // Items
      items: (invoice.items || []).map(item => ({
        ...item,
        hsnCode: item.hsnCode || '',
      })),
      dbProducts,

      // Financials
      subtotal:    invoice.subtotal    || 0,
      taxAmount:   invoice.taxAmount   || 0,
      discount:    invoice.discount    || 0,
      shipping:    invoice.shipping    || 0,
      totalAmount: invoice.totalAmount || invoice.total || 0,

      // GST
      gstType:     invoice.gstType    || 'none',
      cgst:        invoice.cgst       || 0,
      sgst:        invoice.sgst       || 0,
      igst:        invoice.igst       || 0,
      sellerState: profile.state      || invoice.sellerState || '',

      symbol: sym,
    };

    const blob = await pdf(<InvoicePDF data={data} />).toBlob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Invoice-${data.invoiceNumber || 'download'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('PDF generation failed:', err);
    throw err;
  }
};

export const printInvoicePDF = async (invoice, options = {}) => {
  try {
    let profile = options.profile || {};
    if (!options.profile) {
      try { const res = await api.get('/auth/profile'); profile = res.data; } catch (_) {}
    }
    let dbProducts = options.dbProducts || [];
    if (!options.dbProducts) {
      try { const res = await api.get('/products'); dbProducts = res.data; } catch (_) {}
    }

    const sym = options.symbol || '₹';
    const client = invoice.clientId || {};
    const billingAddr = client.billingAddress || {};

    const data = {
      businessName:    profile.businessName  || 'Your Business',
      businessAddress: profile.businessAddress || '',
      state:           profile.state          || invoice.sellerState || '',
      gstNumber:       profile.gstNumber      || '',
      senderEmail:     profile.email          || '',
      phone:           profile.phone          || '',
      logo:            profile.logo           || null,
      invoiceNumber:   invoice.invoiceNumber  || '',
      poNumber:        invoice.poNumber       || '',
      date:   invoice.date    ? new Date(invoice.date).toLocaleDateString('en-IN')    : '',
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : '',
      notes:  invoice.notes   || '',
      clientName:    client.name || '',
      clientEmail:   client.email || '',
      clientPhone:   client.phone || '',
      clientAddress: [billingAddr.street, billingAddr.city, billingAddr.zip].filter(Boolean).join(', '),
      buyerState:    billingAddr.state || invoice.buyerState || '',
      clientGstin:   client.taxId || '',
      items:         (invoice.items || []).map(item => ({ ...item })),
      dbProducts,
      subtotal:    invoice.subtotal    || 0,
      taxAmount:   invoice.taxAmount   || 0,
      discount:    invoice.discount    || 0,
      shipping:    invoice.shipping    || 0,
      totalAmount: invoice.totalAmount || 0,
      gstType:     invoice.gstType    || 'none',
      cgst:        invoice.cgst       || 0,
      sgst:        invoice.sgst       || 0,
      igst:        invoice.igst       || 0,
      sellerState: profile.state      || invoice.sellerState || '',
      symbol: sym,
    };

    const blob = await pdf(<InvoicePDF data={data} />).toBlob();
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, '_blank');
    if (win) win.addEventListener('load', () => { win.focus(); win.print(); });
  } catch (err) {
    console.error('Print failed:', err);
    throw err;
  }
};
