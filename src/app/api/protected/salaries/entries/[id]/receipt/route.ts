import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthContext } from '@/lib/get-auth-context'

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const entry = await db.salaryEntry.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { receiptData: true, receiptMimeType: true },
  })
  if (!entry?.receiptData || !entry.receiptMimeType) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(entry.receiptData), {
    headers: {
      'Content-Type': entry.receiptMimeType,
      'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    },
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext()
  if (!ctx || !ctx.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const entry = await db.salaryEntry.findFirst({
    where: { id, organizationId: ctx.organizationId },
    select: { id: true },
  })
  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Use a JPEG, PNG or WebP image.' }, { status: 400 })
  }
  if (file.size > MAX_RECEIPT_SIZE) {
    return NextResponse.json({ error: 'The receipt image must be under 5MB.' }, { status: 400 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  await db.salaryEntry.update({
    where: { id: entry.id },
    data: {
      receiptData: bytes,
      receiptMimeType: file.type,
      receiptName: file.name.slice(0, 200),
    },
  })

  return NextResponse.json({ ok: true })
}
