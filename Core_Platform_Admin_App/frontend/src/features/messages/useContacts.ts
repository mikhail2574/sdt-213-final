import { useCallback, useMemo, useState } from 'react'
import { usersApi } from '../../api/usersApi'
import useAsync from '../../hooks/useAsync'
import type { User } from '../../types/api'

export type Contact = Pick<User, 'id' | 'name' | 'role'>

const PAGE_SIZE = 100
const MAX_PAGES = 5

/** Conversations carry only user ids, so names come from the directory the user is allowed to see. */
async function loadDirectory(): Promise<Contact[]> {
  const people: Contact[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await usersApi.list({ page, size: PAGE_SIZE })
    people.push(...result.items)
    if ((page + 1) * PAGE_SIZE >= result.total) break
  }
  return people
}

/**
 * Names of the people the user can see in the directory, plus anyone picked in this session.
 * Without directory access (applicants) only remembered contacts are known.
 */
export default function useContacts(canSearch: boolean) {
  const directory = useAsync(() => (canSearch ? loadDirectory() : Promise.resolve([])), [canSearch])
  const [remembered, setRemembered] = useState<Contact[]>([])

  const byId = useMemo(
    () => new Map([...(directory.data ?? []), ...remembered].map(contact => [contact.id, contact])),
    [directory.data, remembered],
  )
  const remember = useCallback((contact: Contact) => setRemembered(previous => [...previous, contact]), [])

  return { byId, remember }
}
