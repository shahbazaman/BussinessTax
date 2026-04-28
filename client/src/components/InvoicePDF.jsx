import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';

const SLATE = '#1e293b';
const SLATE_MID = '#475569';
const SLATE_LIGHT = '#94a3b8';
const SLATE_BG = '#f8fafc';
const BORDER = '#e2e8f0';
const INDIGO = '#4f46e5';
const GREEN = '#16a34a';
const AMBER = '#d97706';

const styles = StyleSheet.create({
  page: { padding: 36, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica', fontSize: 10, color: SLATE },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 18, borderBottomWidth: 2, borderBottomColor: SLATE },
  logo: { width: 48, height: 48, borderRadius: 8, marginBottom: 6 },
  brandName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: SLATE },
  brandSub: { fontSize: 8, color: SLATE_LIGHT, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1.5 },
  invoiceTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: INDIGO, textAlign: 'right' },
  invoiceNumber: { fontSize: 10, color: SLATE_MID, textAlign: 'right', marginTop: 3 },
  invoiceDates: { fontSize: 8, color: SLATE_LIGHT, textAlign: 'right', marginTop: 2 },
  copyLabel: { backgroundColor: SLATE_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', marginBottom: 16 },
  copyLabelText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: SLATE_MID, textTransform: 'uppercase', letterSpacing: 1 },
  partiesRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  partyCard: { flex: 1, backgroundColor: SLATE_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12 },
  partyTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: SLATE_LIGHT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  partyName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: SLATE, marginBottom: 3 },
  partyLine: { fontSize: 9, color: SLATE_MID, marginBottom: 2, lineHeight: 1.5 },
  gstBadge: { marginTop: 6, backgroundColor: '#ede9fe', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  gstBadgeText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: INDIGO },
  supplyBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  supplyBannerIntra: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  supplyBannerInter: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a' },
  supplyBannerNone: { backgroundColor: SLATE_BG, borderWidth: 1, borderColor: BORDER },
  supplyBannerText: { fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  supplyBannerSub: { fontSize: 8, color: SLATE_MID, marginLeft: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: SLATE, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 7, marginBottom: 1 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 8, paddingVertical: 7 },
  tableRowAlt: { backgroundColor: SLATE_BG },
  thText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.6 },
  tdText: { fontSize: 9, color: SLATE_MID },
  tdBold: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: SLATE },
  colSno: { width: 24 },
  colDesc: { flex: 3 },
  colHsn: { width: 58 },
  colQty: { width: 32, textAlign: 'right' },
  colRate: { width: 58, textAlign: 'right' },
  colTax: { width: 38, textAlign: 'center' },
  colAmt: { width: 68, textAlign: 'right' },
  totalsArea: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalsBox: { width: 260 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 10 },
  totalLabel: { fontSize: 9, color: SLATE_MID, fontFamily: 'Helvetica-Bold' },
  totalValue: { fontSize: 9, color: SLATE, fontFamily: 'Helvetica-Bold' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: SLATE, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, marginTop: 4 },
  grandTotalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  grandTotalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#FFFFFF' },
  gstBox: { borderWidth: 1, borderColor: BORDER, borderRadius: 6, padding: 10, marginTop: 10, marginBottom: 4 },
  gstBoxTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: SLATE_LIGHT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  gstRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  gstLabel: { fontSize: 9, color: SLATE_MID },
  gstValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: SLATE },
  amountWords: { backgroundColor: SLATE_BG, borderRadius: 6, padding: 8, marginTop: 10, borderWidth: 1, borderColor: BORDER },
  amountWordsLabel: { fontSize: 8, color: SLATE_LIGHT, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  amountWordsText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: SLATE },
  notesBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
  notesTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: SLATE_LIGHT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  notesText: { fontSize: 9, color: SLATE_MID, lineHeight: 1.6 },
  footer: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: BORDER, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerText: { fontSize: 8, color: SLATE_LIGHT },
  signatureBox: { alignItems: 'flex-end' },
  signatureLine: { width: 120, borderTopWidth: 1, borderTopColor: SLATE_MID, marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: SLATE_MID, fontFamily: 'Helvetica-Bold' },
  signatureSub: { fontSize: 7, color: SLATE_LIGHT, marginTop: 1 },
});

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tensW = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const toWords = (n) => {
  if (!n || n === 0) return 'Zero';
  if (n < 20) return ones[n];
  if (n < 100) return tensW[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
  if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
  if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
  return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
};

const amountInWords = (amount) => {
  if (!amount) return 'Zero Only';
  const whole = Math.floor(Number(amount));
  const paise = Math.round((Number(amount) - whole) * 100);
  return toWords(whole) + (paise > 0 ? ` and ${toWords(paise)} Paise` : '') + ' Only';
};

const InvoicePDF = ({ data }) => {
  const sym = data.symbol || '₹';
  const fmt = (n) => `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const gstType = data.gstType || 'none';
  const bannerStyle = gstType === 'intra' ? styles.supplyBannerIntra : gstType === 'inter' ? styles.supplyBannerInter : styles.supplyBannerNone;
  const bannerColor = gstType === 'intra' ? GREEN : gstType === 'inter' ? AMBER : SLATE_MID;
  const bannerLabel = gstType === 'intra'
    ? 'Intra-State Supply — CGST + SGST Applicable'
    : gstType === 'inter'
    ? 'Inter-State Supply — IGST Applicable'
    : 'GST Supply Details';

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* HEADER */}
        <View style={styles.headerRow}>
          <View>
            {data.logo && <Image src={data.logo} style={styles.logo} />}
            <Text style={styles.brandName}>{data.businessName || 'Your Business'}</Text>
            {data.companyName && <Text style={styles.brandSub}>{data.companyName}</Text>}
            {data.businessAddress && <Text style={[styles.partyLine, { marginTop: 4, maxWidth: 220 }]}>{data.businessAddress}</Text>}
            {data.state && <Text style={styles.partyLine}>{data.state}</Text>}
            {data.gstNumber && <Text style={[styles.partyLine, { marginTop: 3 }]}>GSTIN: {data.gstNumber}</Text>}
            {data.senderEmail && <Text style={styles.partyLine}>{data.senderEmail}</Text>}
            {data.phone && <Text style={styles.partyLine}>Ph: {data.phone}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{data.invoiceNumber || '—'}</Text>
            {data.poNumber && <Text style={styles.invoiceDates}>PO: {data.poNumber}</Text>}
            <Text style={[styles.invoiceDates, { marginTop: 6 }]}>Date: {data.date || '—'}</Text>
            {data.dueDate && <Text style={styles.invoiceDates}>Due: {data.dueDate}</Text>}
            <View style={[styles.copyLabel, { marginTop: 10 }]}>
              <Text style={styles.copyLabelText}>Original for Recipient</Text>
            </View>
          </View>
        </View>

        {/* PARTIES */}
        <View style={styles.partiesRow}>
          <View style={styles.partyCard}>
            <Text style={styles.partyTitle}>Bill From</Text>
            <Text style={styles.partyName}>{data.businessName || '—'}</Text>
            {data.businessAddress && <Text style={styles.partyLine}>{data.businessAddress}</Text>}
            {data.state && <Text style={styles.partyLine}>{data.state}</Text>}
            {data.gstNumber && (
              <View style={styles.gstBadge}><Text style={styles.gstBadgeText}>GSTIN: {data.gstNumber}</Text></View>
            )}
          </View>
          <View style={styles.partyCard}>
            <Text style={styles.partyTitle}>Bill To</Text>
            <Text style={styles.partyName}>{data.clientName || '—'}</Text>
            {data.clientEmail && <Text style={styles.partyLine}>{data.clientEmail}</Text>}
            {data.clientPhone && <Text style={styles.partyLine}>Ph: {data.clientPhone}</Text>}
            {data.clientAddress && <Text style={styles.partyLine}>{data.clientAddress}</Text>}
            {data.buyerState && <Text style={styles.partyLine}>{data.buyerState}</Text>}
            {data.clientGstin && (
              <View style={styles.gstBadge}><Text style={styles.gstBadgeText}>GSTIN: {data.clientGstin}</Text></View>
            )}
          </View>
        </View>

        {/* SUPPLY TYPE BANNER */}
        <View style={[styles.supplyBanner, bannerStyle]}>
          <Text style={[styles.supplyBannerText, { color: bannerColor }]}>{bannerLabel}</Text>
          {data.sellerState && data.buyerState && (
            <Text style={styles.supplyBannerSub}> | {data.sellerState} → {data.buyerState}</Text>
          )}
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, styles.colSno]}>#</Text>
          <Text style={[styles.thText, styles.colDesc]}>Description</Text>
          <Text style={[styles.thText, styles.colHsn]}>HSN/SAC</Text>
          <Text style={[styles.thText, styles.colQty]}>Qty</Text>
          <Text style={[styles.thText, styles.colRate]}>Rate</Text>
          <Text style={[styles.thText, styles.colTax]}>Tax%</Text>
          <Text style={[styles.thText, styles.colAmt]}>Amount</Text>
        </View>

        {(data.items || []).map((item, i) => {
          const prod = (data.dbProducts || []).find(p => p._id === item.productId);
          const hsn = prod?.hsnCode || item.hsnCode || '—';
          const amount = Number(item.quantity || 0) * Number(item.price || 0);
          return (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tdText, styles.colSno]}>{i + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.tdBold}>{item.name || item.description || '—'}</Text>
                {item.variantName && <Text style={[styles.tdText, { fontSize: 8, color: SLATE_LIGHT }]}>{item.variantName}</Text>}
              </View>
              <Text style={[styles.tdText, styles.colHsn]}>{hsn}</Text>
              <Text style={[styles.tdText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.tdText, styles.colRate]}>{fmt(item.price)}</Text>
              <Text style={[styles.tdText, styles.colTax]}>{item.taxRate || 0}%</Text>
              <Text style={[styles.tdBold, styles.colAmt]}>{fmt(amount)}</Text>
            </View>
          );
        })}

        {/* TOTALS */}
        <View style={styles.totalsArea}>
          <View style={styles.totalsBox}>
            {gstType !== 'none' && (
              <View style={styles.gstBox}>
                <Text style={styles.gstBoxTitle}>Tax Breakup</Text>
                <View style={styles.gstRow}>
                  <Text style={styles.gstLabel}>Taxable Amount</Text>
                  <Text style={styles.gstValue}>{fmt(data.subtotal)}</Text>
                </View>
                {gstType === 'intra' && (
                  <>
                    <View style={styles.gstRow}>
                      <Text style={[styles.gstLabel, { color: GREEN }]}>CGST</Text>
                      <Text style={[styles.gstValue, { color: GREEN }]}>{fmt(data.cgst)}</Text>
                    </View>
                    <View style={styles.gstRow}>
                      <Text style={[styles.gstLabel, { color: GREEN }]}>SGST</Text>
                      <Text style={[styles.gstValue, { color: GREEN }]}>{fmt(data.sgst)}</Text>
                    </View>
                  </>
                )}
                {gstType === 'inter' && (
                  <View style={styles.gstRow}>
                    <Text style={[styles.gstLabel, { color: AMBER }]}>IGST</Text>
                    <Text style={[styles.gstValue, { color: AMBER }]}>{fmt(data.igst)}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(data.subtotal)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Tax</Text>
              <Text style={styles.totalValue}>{fmt(data.taxAmount)}</Text>
            </View>
            {Number(data.discount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, { color: '#dc2626' }]}>- {fmt(data.discount)}</Text>
              </View>
            )}
            {Number(data.shipping) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValue}>{fmt(data.shipping)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Payable</Text>
              <Text style={styles.grandTotalValue}>{fmt(data.totalAmount || data.total)}</Text>
            </View>
          </View>
        </View>

        {/* AMOUNT IN WORDS */}
        <View style={styles.amountWords}>
          <Text style={styles.amountWordsLabel}>Amount in Words</Text>
          <Text style={styles.amountWordsText}>{amountInWords(data.totalAmount || data.total)}</Text>
        </View>

        {/* NOTES */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Notes / Terms</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* BANK DETAILS */}
        {(data.bankName || data.bankAccount || data.upiId) && (
          <View style={[styles.notesBox, { marginTop: 14 }]}>
            <Text style={styles.notesTitle}>Payment Details</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {data.bankName && (
                <View style={{ marginRight: 20 }}>
                  <Text style={[styles.gstLabel, { fontSize: 8, color: SLATE_LIGHT }]}>Bank Name</Text>
                  <Text style={[styles.gstValue, { fontSize: 9 }]}>{data.bankName}</Text>
                </View>
              )}
              {data.bankAccount && (
                <View style={{ marginRight: 20 }}>
                  <Text style={[styles.gstLabel, { fontSize: 8, color: SLATE_LIGHT }]}>Account No.</Text>
                  <Text style={[styles.gstValue, { fontSize: 9 }]}>{data.bankAccount}</Text>
                </View>
              )}
              {data.bankIfsc && (
                <View style={{ marginRight: 20 }}>
                  <Text style={[styles.gstLabel, { fontSize: 8, color: SLATE_LIGHT }]}>IFSC Code</Text>
                  <Text style={[styles.gstValue, { fontSize: 9 }]}>{data.bankIfsc}</Text>
                </View>
              )}
              {data.bankBranch && (
                <View style={{ marginRight: 20 }}>
                  <Text style={[styles.gstLabel, { fontSize: 8, color: SLATE_LIGHT }]}>Branch</Text>
                  <Text style={[styles.gstValue, { fontSize: 9 }]}>{data.bankBranch}</Text>
                </View>
              )}
              {data.upiId && (
                <View>
                  <Text style={[styles.gstLabel, { fontSize: 8, color: SLATE_LIGHT }]}>UPI ID</Text>
                  <Text style={[styles.gstValue, { fontSize: 9, color: INDIGO }]}>{data.upiId}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* PAYMENT STATUS STAMP */}
        {data.status === 'Paid' && (
          <View style={{
            position: 'absolute', top: 180, right: 36,
            borderWidth: 3, borderColor: GREEN, borderRadius: 8,
            paddingHorizontal: 16, paddingVertical: 8,
            transform: [{ rotate: '-15deg' }], opacity: 0.6,
          }}>
            <Text style={{ fontSize: 28, fontFamily: 'Helvetica-Bold', color: GREEN, letterSpacing: 2 }}>PAID</Text>
            {data.paidDate && (
              <Text style={{ fontSize: 8, color: GREEN, textAlign: 'center', marginTop: 2 }}>{data.paidDate}</Text>
            )}
          </View>
        )}
        {data.status === 'Cancelled' && (
          <View style={{
            position: 'absolute', top: 180, right: 36,
            borderWidth: 3, borderColor: '#dc2626', borderRadius: 8,
            paddingHorizontal: 12, paddingVertical: 8,
            transform: [{ rotate: '-15deg' }], opacity: 0.5,
          }}>
            <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#dc2626', letterSpacing: 2 }}>CANCELLED</Text>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <View>
            <Text style={[styles.footerText, { fontFamily: 'Helvetica-Bold', color: SLATE, marginBottom: 2 }]}>
              Thank you for your business!
            </Text>
            <Text style={styles.footerText}>
              {data.senderEmail || ''}{data.phone ? '  |  Ph: ' + data.phone : ''}
            </Text>
            {data.gstNumber && (
              <Text style={[styles.footerText, { marginTop: 3 }]}>GSTIN: {data.gstNumber}</Text>
            )}
            <Text style={[styles.footerText, { marginTop: 6 }]}>
              This is a computer-generated invoice and does not require a physical signature.
            </Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Authorised Signatory</Text>
            <Text style={styles.signatureSub}>{data.businessName || ''}</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default InvoicePDF;
