import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import HSN_CODES from "./hsnCodes";
export const printPDF = async (invoice) => {
  const doc = new jsPDF();

  const getHsnDescription = (code) => {
    if (!code) return "";
    const match = HSN_CODES.find((h) => h.code === code);
    return match ? match.description : "";
  };

  const formatCurrency = (val) =>
    `₹${Number(val || 0).toFixed(2)}`;

  doc.setFontSize(18);
  doc.text("TAX INVOICE", 14, 18);

  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNumber || invoice.purchaseNumber || "-"}`, 14, 28);
  doc.text(`Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : "-"}`, 14, 34);

  doc.text(`GSTIN: ${invoice.gstNumber || "-"}`, 14, 40);

  doc.setFontSize(11);
  doc.text("Bill To:", 14, 50);

  doc.setFontSize(10);
  doc.text(invoice.client?.name || invoice.clientName || "-", 14, 56);
  doc.text(invoice.billingAddress || "-", 14, 62, { maxWidth: 90 });

  if (invoice.shippingAddress) {
    doc.text("Ship To:", 120, 50);
    doc.text(invoice.shippingAddress, 120, 56, { maxWidth: 70 });
  }

  const tableBody = (invoice.items || []).map((item, i) => {
    const hsn = item.hsnCode || "-";
    const desc = getHsnDescription(hsn);

    const amount = (item.quantity || 0) * (item.price || 0);

    return [
      i + 1,
      item.name || "-",
      hsn,
      desc ? desc.substring(0, 25) : "-",
      item.quantity || 0,
      formatCurrency(item.price),
      `${item.taxRate || 0}%`,
      formatCurrency(amount),
    ];
  });

  autoTable(doc, {
    startY: 75,
    head: [["#", "Item", "HSN", "HSN Desc", "Qty", "Rate", "Tax %", "Amount"]],
    body: tableBody,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  const subtotal = (invoice.items || []).reduce(
    (acc, item) =>
      acc + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );

  const discount = Number(invoice.discount || 0);

  const cgst = Number(invoice.cgst || 0);
  const sgst = Number(invoice.sgst || 0);
  const igst = Number(invoice.igst || 0);

  const totalTax = cgst + sgst + igst;
  const grandTotal = subtotal + totalTax - discount;

  let y = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(10);

  doc.text(`Subtotal: ${formatCurrency(subtotal)}`, 140, y);
  y += 6;

  // GST Split
  if (invoice.gstType === "intra") {
    doc.text(`CGST: ${formatCurrency(cgst)}`, 140, y);
    y += 6;
    doc.text(`SGST: ${formatCurrency(sgst)}`, 140, y);
    y += 6;
  }

  if (invoice.gstType === "inter") {
    doc.text(`IGST: ${formatCurrency(igst)}`, 140, y);
    y += 6;
  }

  if (invoice.gstType === "none") {
    doc.text(`Tax: ${formatCurrency(totalTax)}`, 140, y);
    y += 6;
  }

  doc.text(`Discount: ${formatCurrency(discount)}`, 140, y);
  y += 6;

  doc.setFontSize(12);
  doc.text(`Grand Total: ${formatCurrency(grandTotal)}`, 140, y);

  try {
    const qrData = `
Invoice: ${invoice.invoiceNumber || "-"}
Amount: ${grandTotal}
Customer: ${invoice.clientName || ""}
    `;

    const qrImage = await QRCode.toDataURL(qrData);

    doc.addImage(qrImage, "PNG", 14, y + 10, 40, 40);
  } catch (err) {
    console.error("QR generation failed", err);
  }

  doc.setFontSize(9);
  doc.text("Thank you for your business!", 14, 285);

  doc.save(`${invoice.invoiceNumber || "invoice"}.pdf`);
};