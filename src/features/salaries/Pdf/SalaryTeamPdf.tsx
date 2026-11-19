import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

export interface SalaryTeamPdfRow {
  name: string
  tenure: string
  period: string
  base: string
  advances: string
  deductions: string
  paid: string
  pending: string
  status: string
  statusTone: 'payable' | 'against' | 'current'
}

export interface SalaryTeamPdfProps {
  workshopName: string
  workshopAddress: string
  workshopPhone: string
  rangeLabel: string
  generatedLabel: string
  rows: SalaryTeamPdfRow[]
  totals: {
    base: string
    advances: string
    deductions: string
    paid: string
    pending: string
  }
  labels: {
    title: string
    subtitle: string
    worker: string
    seniority: string
    period: string
    baseSalary: string
    advances: string
    deductions: string
    paid: string
    pending: string
    status: string
    totals: string
    generated: string
    footer: string
  }
}

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9, color: '#16202b' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#103d6f',
    paddingBottom: 9,
  },
  workshop: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: '#103d6f' },
  meta: { color: '#566574', fontSize: 8, marginTop: 2 },
  generated: { color: '#566574', fontSize: 8, textAlign: 'right' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#103d6f', marginTop: 13 },
  subtitle: { color: '#566574', fontSize: 8.5, marginTop: 2 },
  table: { marginTop: 12, borderWidth: 1, borderColor: '#d5e1ec' },
  head: { flexDirection: 'row', backgroundColor: '#103d6f' },
  headCell: {
    padding: 6,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#e6edf4' },
  cell: { padding: 6, fontSize: 8 },
  worker: { flex: 1.4 },
  seniority: { width: 80 },
  period: { width: 120 },
  money: { width: 68, textAlign: 'right' },
  status: { width: 62, textAlign: 'center' },
  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#103d6f',
    backgroundColor: '#fdece2',
  },
  totalLabel: {
    width: 380,
    padding: 7,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#103d6f',
  },
  totalValue: {
    width: 68,
    padding: 7,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#103d6f',
  },
  totalStatus: { width: 62 },
  footer: { marginTop: 14, fontSize: 7.5, color: '#8a97a5', textAlign: 'center' },
})

export function SalaryTeamPdf(props: SalaryTeamPdfProps) {
  const { labels } = props
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.workshop}>{props.workshopName}</Text>
            {props.workshopAddress ? <Text style={styles.meta}>{props.workshopAddress}</Text> : null}
            {props.workshopPhone ? <Text style={styles.meta}>{props.workshopPhone}</Text> : null}
          </View>
          <Text style={styles.generated}>
            {labels.generated}: {props.generatedLabel}
          </Text>
        </View>

        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.subtitle}>{props.rangeLabel}</Text>

        <View style={styles.table}>
          <View style={styles.head}>
            <Text style={[styles.headCell, styles.worker]}>{labels.worker}</Text>
            <Text style={[styles.headCell, styles.seniority]}>{labels.seniority}</Text>
            <Text style={[styles.headCell, styles.period]}>{labels.period}</Text>
            <Text style={[styles.headCell, styles.money]}>{labels.baseSalary}</Text>
            <Text style={[styles.headCell, styles.money]}>{labels.advances}</Text>
            <Text style={[styles.headCell, styles.money]}>{labels.deductions}</Text>
            <Text style={[styles.headCell, styles.money]}>{labels.paid}</Text>
            <Text style={[styles.headCell, styles.money]}>{labels.pending}</Text>
            <Text style={[styles.headCell, styles.status]}>{labels.status}</Text>
          </View>
          {props.rows.map((row) => (
            <View key={row.name} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.worker]}>{row.name}</Text>
              <Text style={[styles.cell, styles.seniority]}>{row.tenure}</Text>
              <Text style={[styles.cell, styles.period]}>{row.period}</Text>
              <Text style={[styles.cell, styles.money]}>{row.base}</Text>
              <Text style={[styles.cell, styles.money]}>{row.advances}</Text>
              <Text style={[styles.cell, styles.money]}>{row.deductions}</Text>
              <Text style={[styles.cell, styles.money]}>{row.paid}</Text>
              <Text style={[styles.cell, styles.money]}>{row.pending}</Text>
              <Text
                style={[
                  styles.cell,
                  styles.status,
                  {
                    color:
                      row.statusTone === 'against'
                        ? '#b91c1c'
                        : row.statusTone === 'current'
                          ? '#047857'
                          : '#b45309',
                  },
                ]}
              >
                {row.status}
              </Text>
            </View>
          ))}
          <View style={styles.totalsRow}>
            <Text style={styles.totalLabel}>{labels.totals}</Text>
            <Text style={styles.totalValue}>{props.totals.base}</Text>
            <Text style={styles.totalValue}>{props.totals.advances}</Text>
            <Text style={styles.totalValue}>{props.totals.deductions}</Text>
            <Text style={styles.totalValue}>{props.totals.paid}</Text>
            <Text style={styles.totalValue}>{props.totals.pending}</Text>
            <Text style={styles.totalStatus} />
          </View>
        </View>

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  )
}
