import { PermissionSubject } from '@/lib/permissions'

/** The three kinds of work the shop runs. */
export type JobKind = 'mechanics' | 'brakes' | 'wash'

/** Which permission lets somebody open a job of this kind. */
export function jobKindSubject(kind: JobKind | undefined): PermissionSubject {
  if (kind === 'brakes') return PermissionSubject.BRAKES
  if (kind === 'wash') return PermissionSubject.WASH
  return PermissionSubject.SERVICES
}
