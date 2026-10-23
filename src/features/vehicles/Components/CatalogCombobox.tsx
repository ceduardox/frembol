'use client'

import { CalendarDays, Car, CarFront, Check, ChevronsUpDown, Gauge, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type CatalogIcon = 'make' | 'model' | 'year' | 'engine'

const ICONS = {
  make: Car,
  model: CarFront,
  year: CalendarDays,
  engine: Gauge,
} as const

/**
 * A searchable picker for the vehicle catalogue (make, model, year).
 *
 * Built on the same Popover + Command the rest of the app uses, so it carries
 * the workshop's theme and keyboard behaviour. Anything typed that is not in
 * the list is offered as a free value, because the catalogue is a suggestion,
 * not a closed taxonomy.
 */
export function CatalogCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  icon,
  emptyLabel,
  useLabel,
  disabled,
  listClassName,
  logoFor,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  icon?: CatalogIcon
  emptyLabel: string
  useLabel: (value: string) => string
  disabled?: boolean
  listClassName?: string
  /** Optional brand logo for an option (makes). Falls back to the icon. */
  logoFor?: (value: string) => string | undefined
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const Icon = icon ? ICONS[icon] : undefined
  const selectedLogo = logoFor?.(value)
  const trimmed = search.trim()
  const known = options.some((o) => o.toLowerCase() === trimmed.toLowerCase())

  const pick = (next: string) => {
    onChange(next)
    setSearch('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="border-input dark:bg-input/30 h-9 w-full justify-between rounded-md px-3 font-normal shadow-xs"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selectedLogo ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white">
                <img src={selectedLogo} alt="" className="h-3.5 w-3.5 object-contain" />
              </span>
            ) : Icon ? (
              <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            ) : null}
            <span className={cn('truncate', !value && 'text-muted-foreground')}>
              {value || placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-64 overflow-hidden p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList
            className={cn(
              // The list scrolls, but the scrollbar is hidden: it read as a
              // heavy grey bar against the dark surface.
              'max-h-72 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
              listClassName
            )}
          >
            <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">
              {emptyLabel}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const logo = logoFor?.(option)
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => pick(option)}
                    className="gap-2"
                  >
                    {logo ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-white">
                        <img src={logo} alt="" className="h-3.5 w-3.5 object-contain" />
                      </span>
                    ) : Icon ? (
                      <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    ) : null}
                    <span className="flex-1 truncate">{option}</span>
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        value === option ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {trimmed && !known && (
              <CommandGroup>
                <CommandItem value={`__use__${trimmed}`} onSelect={() => pick(trimmed)}>
                  <Plus className="h-3.5 w-3.5" />
                  {useLabel(trimmed)}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
