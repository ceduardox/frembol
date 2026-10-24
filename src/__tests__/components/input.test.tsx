import { describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { Input } from '@/components/ui/input'

/** Let the focus handler's zero-delay selection run. */
async function flushFocus() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe('Input', () => {
  it('selects the whole value when a number field gets focus', async () => {
    const select = vi.spyOn(HTMLInputElement.prototype, 'select').mockImplementation(() => {})
    const { getByRole } = render(<Input type="number" defaultValue="0" />)
    const input = getByRole('spinbutton') as HTMLInputElement

    input.focus()
    await flushFocus()

    expect(select).toHaveBeenCalled()
    select.mockRestore()
  })

  it('leaves text fields to place the caret normally', async () => {
    const select = vi.spyOn(HTMLInputElement.prototype, 'select').mockImplementation(() => {})
    const { getByRole } = render(<Input type="text" defaultValue="50000" />)
    const input = getByRole('textbox') as HTMLInputElement

    input.focus()
    await flushFocus()

    expect(select).not.toHaveBeenCalled()
    select.mockRestore()
  })
})
