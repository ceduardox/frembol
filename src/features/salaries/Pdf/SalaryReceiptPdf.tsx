import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

export interface SalaryReceiptPdfProps {
  workshopName: string
  workshopAddress: string
  workshopPhone: string
  employeeName: string
  periodStart: string
  periodEnd: string
  paymentDate: string
  receiptNumber: string
  base: string
  advances: string
  deductions: string
  paidThisReceipt: string
  totalPaid: string
  pending: string
  labels: {
    title: string
    receiptNumber: string
    date: string
    employee: string
    period: string
    concept: string
    amount: string
    base: string
    advances: string
    deductions: string
    paidThisReceipt: string
    totalPaid: string
    pending: string
    workerSignature: string
    workshopSignature: string
    footer: string
  }
}

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#16202b' },
  header: { borderBottomWidth: 2, borderBottomColor: '#103d6f', paddingBottom: 10 },
  workshop: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#103d6f' },
  meta: { color: '#566574', fontSize: 9, marginTop: 3 },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
  },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#103d6f' },
  receiptNo: { fontSize: 9, color: '#566574' },
  info: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    padding: 10,
    backgroundColor: '#f2f6fa',
    borderWidth: 1,
    borderColor: '#d5e1ec',
  },
  infoCell: { flex: 1 },
  label: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  value: { fontSize: 10, marginTop: 3, fontFamily: 'Helvetica-Bold' },
  table: { marginTop: 20, borderWidth: 1, borderColor: '#d5e1ec' },
  tableHead: { flexDirection: 'row', backgroundColor: '#103d6f', color: '#ffffff' },
  tableHeadCell: { padding: 7, fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#d5e1ec' },
  cell: { padding: 8, fontSize: 10 },
  concept: { flex: 1 },
  amount: { width: 110, textAlign: 'right' },
  totalRow: { flexDirection: 'row', borderTopWidth: 2, borderTopColor: '#103d6f' },
  totalLabel: {
    flex: 1,
    padding: 9,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#103d6f',
  },
  totalValue: {
    width: 110,
    padding: 9,
    textAlign: 'right',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#103d6f',
  },
  pendingRow: {
    flexDirection: 'row',
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#103d6f',
    backgroundColor: '#fdece2',
  },
  pendingLabel: { flex: 1, fontFamily: 'Helvetica-Bold', color: '#103d6f' },
  pendingValue: { fontFamily: 'Helvetica-Bold', color: '#103d6f' },
  signatures: { flexDirection: 'row', gap: 40, marginTop: 64 },
  signature: { flex: 1, borderTopWidth: 1, borderTopColor: '#566574', paddingTop: 5 },
  signatureText: { fontSize: 9, textAlign: 'center' },
  footer: { position: 'absolute', left: 36, right: 36, bottom: 28, fontSize: 8, color: '#8a97a5' },
})

export function SalaryReceiptPdf(props: SalaryReceiptPdfProps) {
  const { labels } = props
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.workshop}>{props.workshopName}</Text>
          {props.workshopAddress ? <Text style={styles.meta}>{props.workshopAddress}</Text> : null}
          {props.workshopPhone ? <Text style={styles.meta}>{props.workshopPhone}</Text> : null}
        </View>

        <View style={styles.headingRow}>
          <Text style={styles.title}>{labels.title}</Text>
          <View>
            <Text style={styles.receiptNo}>
              {labels.receiptNumber}: {props.receiptNumber}
            </Text>
            <Text style={styles.receiptNo}>
              {labels.date}: {props.paymentDate}
            </Text>
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.infoCell}>
            <Text style={styles.label}>{labels.employee}</Text>
            <Text style={styles.value}>{props.employeeName}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.label}>{labels.period}</Text>
            <Text style={styles.value}>
              {props.periodStart} - {props.periodEnd}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.concept]}>{labels.concept}</Text>
            <Text style={[styles.tableHeadCell, styles.amount]}>{labels.amount}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.concept]}>{labels.base}</Text>
            <Text style={[styles.cell, styles.amount]}>{props.base}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.concept]}>{labels.advances}</Text>
            <Text style={[styles.cell, styles.amount]}>- {props.advances}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.concept]}>{labels.deductions}</Text>
            <Text style={[styles.cell, styles.amount]}>- {props.deductions}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.concept]}>{labels.totalPaid}</Text>
            <Text style={[styles.cell, styles.amount]}>{props.totalPaid}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{labels.paidThisReceipt}</Text>
            <Text style={styles.totalValue}>{props.paidThisReceipt}</Text>
          </View>
        </View>

        <View style={styles.pendingRow}>
          <Text style={styles.pendingLabel}>{labels.pending}</Text>
          <Text style={styles.pendingValue}>{props.pending}</Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signature}>
            <Text style={styles.signatureText}>{labels.workerSignature}</Text>
          </View>
          <View style={styles.signature}>
            <Text style={styles.signatureText}>{labels.workshopSignature}</Text>
          </View>
        </View>

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  )
}
