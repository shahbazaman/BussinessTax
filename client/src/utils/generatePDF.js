import jsPDF from 'jspdf';
import 'jspdf-autotable';
export const generateInvoicePDF = (invoice) => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.setTextColor(34, 197, 94);
  doc.text('ACCOUNTGO', 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Professional Business Invoice', 14, 28);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 22);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 28);
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 140, 34);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('BILL TO:', 14, 50);
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(invoice.customerName, 14, 56);
  doc.autoTable({
    startY: 70,
    head: [['Description', 'Status', 'Total']],
    body: [
      ['Service/Product Consultation', invoice.status, `$${invoice.amount.toLocaleString()}`]
    ],
    headStyles: { fillColor: [34, 197, 94] },
    theme: 'striped'
  });
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text(`Total Amount: $${invoice.amount.toLocaleString()}`, 14, finalY + 10);
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text('Thank you for your business!', 14, doc.internal.pageSize.height - 20);
  doc.save(`${invoice.invoiceNumber}.pdf`);
};