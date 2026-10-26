'use client'

import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './mobile-work-order.module.css'

/** Keep fields mounted: collapsing a section must never discard unsaved values. */
export function MobileDisclosure({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  return (
    <section className={[styles.disclosure, className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.disclosureToggle}
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <span>{title}</span>
        <ChevronDown aria-hidden="true" className={expanded ? 'rotate-180' : ''} />
      </button>
      <div id={id} data-expanded={expanded} className={styles.disclosureContent}>
        {children}
      </div>
    </section>
  )
}
