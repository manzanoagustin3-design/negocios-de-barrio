import { useCallback, useState } from 'react'

const KEY = 'ndb_admin_token'

export function useAdminToken() {
  const [token, setTokenState] = useState(() => sessionStorage.getItem(KEY) || '')

  const setToken = useCallback((t) => {
    if (t) sessionStorage.setItem(KEY, t)
    else sessionStorage.removeItem(KEY)
    setTokenState(t)
  }, [])

  return { token, setToken }
}
