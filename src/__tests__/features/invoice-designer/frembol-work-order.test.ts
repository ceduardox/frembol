import { describe, it, expect } from 'vitest'
import React from 'react'
import { Document, renderToBuffer } from '@react-pdf/renderer'
import { buildDocumentSpec, type DocumentData } from '@/features/invoice-designer/Spec/buildSpec'
import { getDefaultLayout } from '@/features/settings/Schema/invoiceLayoutSchema'
import { themeOf } from '@/features/invoice-designer/Components/designTheme'
import { SpecPdfPage } from '@/features/invoice-designer/Pdf/SpecPdf'
import '@/features/vehicles/Components/invoice-pdf/fonts'

describe('Frembol Work Order Template', () => {
  const layout = getDefaultLayout('work_order')
  const template = {
    primaryColor: '#103d6f',
    backgroundColor: '#ffffff',
    textColor: '#222b35',
    companyTextColor: '#103d6f',
    frameBorderColor: '',
    frameShadow: 'false',
    frameSide: 'left' as const,
    frameRadius: 0,
    fontFamily: 'Helvetica',
    headerStyle: 'frembol',
    logoSize: 80,
    logoUrl: '',
  }
  const theme = themeOf(template, layout)

  const data: DocumentData = {
    fields: {
      customer_name: 'ORLANDO PEREZ',
      customer_phone: '77334455',
      service_title: 'Mantenimiento de Frenos y Rectificado',
      vehicle_name: 'Toyota Hilux 2020',
      company_name: 'FREMBOL',
    },
    logoUrl: '',
    labels: {},
    meta: {
      title: 'ORDEN DE TRABAJO',
      number: '100961',
      date: '21/10/2026',
      plate: '3849-XYZ',
    },
    items: [
      {
        n: '1',
        qty: '2',
        unit: 'pza',
        desc: 'Rectificado de discos delanteros',
        sub: 'Sin anomalías',
        price: '150,00',
        total: '300,00',
      },
      {
        n: '2',
        qty: '1',
        unit: 'jgo',
        desc: 'Pastillas de freno cerámicas',
        sub: '',
        price: '250,00',
        total: '250,00',
      },
    ],
    parts: [],
    labor: [],
    findings: [],
    totals: [
      { label: 'Importe', value: '550,00', kind: 'line' },
      { label: 'Total', value: '550,00', kind: 'total' },
      { label: 'A Cuenta', value: '200,00', kind: 'payment' },
      { label: 'Saldo', value: '350,00', kind: 'due' },
    ],
    notes: {},
    warranty: {},
    payment: [],
    sectionLabels: {},
  }

  it('builds the Frembol document spec with the 3-column header, client block, items table, and totals', () => {
    const spec = buildDocumentSpec(layout, theme, data)

    expect(spec).toBeDefined()
    const blockIds = spec.blocks.map((b) => b.id)

    // Check that Frembol custom blocks are present
    expect(blockIds).toContain('header')
    expect(blockIds).toContain('customer')
    expect(blockIds).toContain('items_table')
    expect(blockIds).toContain('totals')

    // Check that redundant blocks are suppressed
    expect(blockIds).not.toContain('header_image')
    expect(blockIds).not.toContain('document_title')
    expect(blockIds).not.toContain('vehicle')
    expect(blockIds).not.toContain('signature')

    // Inspect header block: should be a 3-column row
    const headerBlock = spec.blocks.find((b) => b.id === 'header')!
    expect(headerBlock.content.kind).toBe('row')
    if (headerBlock.content.kind === 'row') {
      expect(headerBlock.content.children).toHaveLength(3) // Left, Center, Right
    }

    // Inspect items table: should have 5 columns (CANT, DESCRIPCIÓN, OBSERVACIONES, PRECIO BS, TOTAL BS)
    const tableBlock = spec.blocks.find((b) => b.id === 'items_table')!
    expect(tableBlock.content.kind).toBe('table')
    if (tableBlock.content.kind === 'table') {
      const colLabels = tableBlock.content.columns.map((c) => c.label)
      expect(colLabels).toEqual(['CANT', 'DESCRIPCIÓN', 'OBSERVACIONES', 'PRECIO BS', 'TOTAL BS'])
      expect(tableBlock.content.headerStyle?.background).toBe('#103d6f')
      expect(tableBlock.content.headerStyle?.color).toBe('#f8d448')
    }

    // Inspect totals block: should be a row with payment boxes and summary box
    const totalsBlock = spec.blocks.find((b) => b.id === 'totals')!
    expect(totalsBlock.content.kind).toBe('row')
  })

  it('successfully compiles the Frembol spec into a PDF buffer via @react-pdf/renderer', async () => {
    const spec = buildDocumentSpec(layout, theme, data)
    const element = React.createElement(Document, {}, React.createElement(SpecPdfPage, { spec }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)

    expect(buffer).toBeDefined()
    expect(buffer.length).toBeGreaterThan(1000)
  })
})
