import Invoice from '../models/Invoice.js';
export const createInvoice = async (invoiceData, userId) => {
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-2026-${(count + 1).toString().padStart(4, '0')}`;
    const newInvoice = new Invoice({
        ...invoiceData,
        invoiceNumber,
        user: userId
    });
    return await newInvoice.save();
};