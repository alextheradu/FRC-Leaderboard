import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

export function useSearch() {
    const [query, setQuery] = useState('')
    const results = useQuery({
        queryKey: ['search', query],
        queryFn: async () => {
            if (!query) return []
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
            return res.json()
        },
        enabled: query.length >= 1,
        staleTime: 30 * 1000,
    })
    return {
        query,
        search: useCallback((q: string) => setQuery(q), []),
        results: results.data ?? [],
        isLoading: results.isLoading,
    }
}
