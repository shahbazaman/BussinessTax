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
      // Bank details
      bankName:    profile.bankName    || '',
      bankAccount: profile.bankAccount || '',
      bankIfsc:    profile.bankIfsc    || '',
      bankBranch:  profile.bankBranch  || '',
      upiId:       profile.upiId       || '',

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
      // Payment status
      status:      invoice.status     || 'Pending',
      paidDate:    invoice.paidDate
        ? new Date(invoice.paidDate).toLocaleDateString('en-IN')
        : '',
      paymentMethod: invoice.paymentMethod || '',

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
