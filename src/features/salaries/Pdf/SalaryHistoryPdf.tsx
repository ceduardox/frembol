import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

export interface SalaryHistoryPdfEntry {
  date: string
  type: string
  concept: string
  receipt: string
  amount: string
  balance: string
  negative: boolean
}

export interface SalaryHistoryPdfPeriod {
  label: string
  base: string
  advances: string
  deductions: string
  paid: string
  pending: string
  entries: SalaryHistoryPdfEntry[]
}

export interface SalaryHistoryPdfProps {
  workshopName: string
  workshopAddress: string
  workshopPhone: string
  employeeName: string
  rangeLabel: string
  generatedLabel: string
  totals: { base: string; advances: string; deductions: string; paid: string; pending: string }
  periods: SalaryHistoryPdfPeriod[]
  labels: {
    title: string
    employee: string
    range: string
    generated: string
    period: string
    baseSalary: string
    advances: string
    deductions: string
    paid: string
    pending: string
    date: string
    type: string
    concept: string
    receipt: string
    amount: string
    balance: string
    totals: string
    noMovements: string
    workerSignature: string
    workshopSignature: string
    footer: string
  }
}

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#16202b' },
  header: { borderBottomWidth: 2, borderBottomColor: '#103d6f', paddingBottom: 10 },
  workshop: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#103d6f' },
  meta: { color: '#566574', fontSize: 8.5, marginTop: 3 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  title: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#103d6f' },
  small: { fontSize: 8.5, color: '#566574', marginTop: 3 },
  info: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    padding: 9,
    backgroundColor: '#f2f6fa',
    borderWidth: 1,
    borderColor: '#d5e1ec',
  },
  infoCell: { flex: 1 },
  label: { fontSize: 7.5, color: '#64748b', textTransform: 'uppercase' },
  value: { fontSize: 9.5, marginTop: 2, fontFamily: 'Helvetica-Bold' },
  totals: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    padding: 9,
    borderWidth: 1,
    borderColor: '#103d6f',
    backgroundColor: '#fdece2',
  },
  totalCell: { flex: 1 },
  totalLabel: { fontSize: 7, color: '#103d6f', textTransform: 'uppercase' },
  totalValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#103d6f', marginTop: 2 },
  period: { marginTop: 16, borderWidth: 1, borderColor: '#d5e1ec' },
  periodHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#103d6f',
    padding: 7,
  },
  periodTitle: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  periodAmounts: { color: '#f8d448', fontSize: 8 },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#f7f9fb',
    borderBottomWidth: 1,
    borderBottomColor: '#d5e1ec',
    padding: 6,
    gap: 8,
  },
  summaryCell: { flex: 1 },
  summaryLabel: { fontSize: 6.5, color: '#64748b', textTransform: 'uppercase' },
  summaryValue: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 1 },
  tableHead: { flexDirection: 'row', backgroundColor: '#eef3f8' },
  tableHeadCell: {
    padding: 6,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#566574',
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e6edf4' },
  cell: { padding: 5, fontSize: 7.8 },
  dateCell: { width: 64 },
  typeCell: { width: 60 },
  conceptCell: { flex: 1 },
  receiptCell: { width: 48, textAlign: 'center' },
  amountCell: { width: 68, textAlign: 'right' },
  balanceCell: { width: 72, textAlign: 'right' },
  note: { fontSize: 7.5, color: '#64748b', marginTop: 1 },
  empty: { padding: 8, fontSize: 8, color: '#64748b', fontStyle: 'italic' },
  signatures: { flexDirection: 'row', gap: 50, marginTop: 44 },
  signature: { flex: 1, borderTopWidth: 1, borderTopColor: '#566574', paddingTop: 5 },
  signatureText: { fontSize: 8, textAlign: 'center', color: '#566574' },
  footer: { marginTop: 18, fontSize: 7.5, color: '#8a97a5', textAlign: 'center' },
})

export function SalaryHistoryPdf(props: SalaryHistoryPdfProps) {
  const { labels } = props
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.workshop}>{props.workshopName}</Text>
          {props.workshopAddress ? <Text style={styles.meta}>{props.workshopAddress}</Text> : null}
          {props.workshopPhone ? <Text style={styles.meta}>{props.workshopPhone}</Text> : null}
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>{labels.title}</Text>
            <Text style={styles.small}>
              {labels.employee}: {props.employeeName}
            </Text>
            <Text style={styles.small}>
              {labels.range}: {props.rangeLabel}
            </Text>
          </View>
          <Text style={styles.small}>
            {labels.generated}: {props.generatedLabel}
          </Text>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>{labels.baseSalary}</Text>
            <Text style={styles.totalValue}>{props.totals.base}</Text>
          </View>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>{labels.advances}</Text>
            <Text style={styles.totalValue}>{props.totals.advances}</Text>
          </View>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>{labels.deductions}</Text>
            <Text style={styles.totalValue}>{props.totals.deductions}</Text>
          </View>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>{labels.paid}</Text>
            <Text style={styles.totalValue}>{props.totals.paid}</Text>
          </View>
          <View style={styles.totalCell}>
            <Text style={styles.totalLabel}>{labels.pending}</Text>
            <Text style={styles.totalValue}>{props.totals.pending}</Text>
          </View>
        </View>

        {props.periods.map((period) => (
          <View key={period.label} style={styles.period} wrap={false}>
            <View style={styles.periodHead}>
              <Text style={styles.periodTitle}>{period.label}</Text>
              <Text style={styles.periodAmounts}>
                {labels.baseSalary}: {period.base} | {labels.paid}: {period.paid}
              </Text>
            </View>
            <View style={styles.summary}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>{labels.baseSalary}</Text>
                <Text style={styles.summaryValue}>{period.base}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>{labels.advances}</Text>
                <Text style={styles.summaryValue}>{period.advances}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>{labels.deductions}</Text>
                <Text style={styles.summaryValue}>{period.deductions}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>{labels.paid}</Text>
                <Text style={styles.summaryValue}>{period.paid}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>{labels.pending}</Text>
                <Text style={styles.summaryValue}>{period.pending}</Text>
              </View>
            </View>
            <View style={styles.tableHead}>
              <Text style={[styles.tableHeadCell, styles.dateCell]}>{labels.date}</Text>
              <Text style={[styles.tableHeadCell, styles.typeCell]}>{labels.type}</Text>
              <Text style={[styles.tableHeadCell, styles.conceptCell]}>{labels.concept}</Text>
              <Text style={[styles.tableHeadCell, styles.receiptCell]}>{labels.receipt}</Text>
              <Text style={[styles.tableHeadCell, styles.amountCell]}>{labels.amount}</Text>
              <Text style={[styles.tableHeadCell, styles.balanceCell]}>{labels.balance}</Text>
            </View>
            {period.entries.length === 0 ? (
              <Text style={styles.empty}>{labels.noMovements}</Text>
            ) : (
              period.entries.map((entry, index) => (
                <View key={`${period.label}-${index}`} style={styles.row}>
                  <Text style={[styles.cell, styles.dateCell]}>{entry.date}</Text>
                  <Text style={[styles.cell, styles.typeCell]}>{entry.type}</Text>
                  <Text style={[styles.cell, styles.conceptCell]}>{entry.concept || '—'}</Text>
                  <Text style={[styles.cell, styles.receiptCell]}>{entry.receipt}</Text>
                  <Text
                    style={[
                      styles.cell,
                      styles.amountCell,
                      { color: entry.negative ? '#b91c1c' : '#047857' },
                    ]}
                  >
                    {entry.negative ? '- ' : ''}
                    {entry.amount}
                  </Text>
                  <Text
                    style={[
                      styles.cell,
                      styles.balanceCell,
                      { color: entry.balance.startsWith('-') ? '#b91c1c' : '#16202b' },
                    ]}
                  >
                    {entry.balance}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))}

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
