'use client'

import { createContext, useContext, type ReactNode } from 'react'

interface PermissionsValue {
  /** Subjects this account may create. `null` means "not resolved", so callers keep the old behaviour. */
  creatableSubjects: string[] | null
  canManageSettings: boolean
}

const PermissionsContext = createContext<PermissionsValue>({
  creatableSubjects: null,
  canManageSettings: true,
})

/**
 * The permissions a client-side menu needs before drawing its entries.
 *
 * The server decides the real answer on every action; this only stops the
 * interface from offering a door that will be refused. `null` keeps a page
 * rendered outside the authenticated layout behaving as it did before.
 */
export function PermissionsProvider({
  creatableSubjects,
  canManageSettings,
  children,
}: PermissionsValue & { children: ReactNode }) {
  return (
    <PermissionsContext.Provider value={{ creatableSubjects, canManageSettings }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissions() {
  const value = useContext(PermissionsContext)
  return {
    ...value,
    canCreate: (subject: string) =>
      value.creatableSubjects === null || value.creatableSubjects.includes(subject),
  }
}
