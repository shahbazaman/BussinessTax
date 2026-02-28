import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  brand: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  status: { fontSize: 10, textTransform: 'uppercase', color: '#64748b', marginTop: 4 },
  section: { marginBottom: 20 },
  label: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 12, color: '#1e293b', fontWeight: 'bold' },
  table: { display: 'table', width: 'auto', borderStyle: 'solid', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f1f5f9', paddingVertical: 8 },
  tableHeader: { backgroundColor: '#f8fafc', fontWeight: 'bold' },
  col: { flex: 1, fontSize: 10, color: '#475569' },
  colRight: { textAlign: 'right' },
  totalSection: { marginTop: 30, alignItems: 'flex-end' },
  totalBox: { width: 150, borderTopWidth: 2, borderColor: '#1e293b', paddingTop: 8 },
  totalText: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' }
});

const InvoicePDF = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>AccountGo</Text>
          <Text style={styles.status}>Invoice #{data.invoiceNumber}</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.value}>{data.date}</Text>
          <Text style={styles.status}>Due: {data.dueDate}</Text>
        </View>
      </View>

      {/* Addresses */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 }}>
        <View>
          <Text style={styles.label}>Bill From</Text>
          <Text style={styles.value}>{data.businessName}</Text>
          <Text style={styles.status}>{data.senderEmail}</Text>
        </View>
        <View style={{ textAlign: 'right' }}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={styles.value}>{data.clientName}</Text>
          <Text style={styles.status}>{data.clientEmail}</Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[styles.col, { flex: 3 }]}>Description</Text>
        <Text style={styles.col}>Qty</Text>
        <Text style={styles.col}>Price</Text>
        <Text style={[styles.col, styles.colRight]}>Amount</Text>
      </View>

      {/* Items */}
      {data.items.map((item, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.col, { flex: 3 }]}>{item.description}</Text>
          <Text style={styles.col}>{item.quantity}</Text>
          <Text style={styles.col}>${item.price}</Text>
          <Text style={[styles.col, styles.colRight]}>
            ${(item.quantity * item.price).toLocaleString()}
          </Text>
        </View>
      ))}

      {/* Totals */}
      <View style={styles.totalSection}>
        <View style={styles.totalBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>${data.subtotal.toLocaleString()}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.label}>Total Amount</Text>
            <Text style={styles.totalText}>${data.total.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </Page>
  </Document>
);

export default InvoicePDF;