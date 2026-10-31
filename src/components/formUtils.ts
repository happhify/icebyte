/* Helper form yang dipakai bersama form PO publik dan halaman admin. */

export function describedBy(...ids: (string | false | undefined)[]) {
  const value = ids.filter(Boolean).join(' ')
  return value || undefined
}

export const labelClass = 'mb-1.5 block font-semibold'
