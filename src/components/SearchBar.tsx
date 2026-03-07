'use client'
import { useSearch } from '@/hooks/useSearch'
import { Search, X } from 'lucide-react'
import { useState } from 'react'

export function SearchBar({ onTeamSelect }: { onTeamSelect: (n: number) => void }) {
    const { query, search, results } = useSearch()
    const [open, setOpen] = useState(false)

    const selectTeam = (teamNumber: number) => {
        onTeamSelect(teamNumber)
        search('')
        setOpen(false)
    }

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={13} style={{ color: 'var(--text-muted)' }} />
                <input value={query}
                    onChange={e => { search(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={e => {
                        if (e.key !== 'Enter') return
                        const firstResult = results[0] as Record<string, unknown> | undefined
                        if (firstResult?.team_number) {
                            selectTeam(firstResult.team_number as number)
                            return
                        }
                        const parsed = parseInt(query.trim(), 10)
                        if (!Number.isNaN(parsed)) selectTeam(parsed)
                    }}
                    placeholder="Search teams..."
                    className="w-full rounded-md pl-8 pr-8 py-1.5 text-xs outline-none transition-colors"
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                    }}
                />
                {query && (
                    <button onClick={() => search('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                        <X size={12} />
                    </button>
                )}
            </div>
            {open && results.length > 0 && (
                <div className="absolute top-full mt-1 w-full rounded-md shadow-lg z-50 overflow-hidden animate-fade-in"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    {results.map((t: Record<string, unknown>) => (
                        <button key={t.team_number as number}
                            onMouseDown={() => selectTeam(t.team_number as number)}
                            className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs transition-colors border-b"
                            style={{ borderColor: 'var(--border)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <span className="font-bold w-12 shrink-0" style={{ color: 'var(--first-blue)' }}>{t.team_number as number}</span>
                            <span className="truncate" style={{ color: 'var(--text-secondary)' }}>
                                {(t.nickname as string) || `Team ${t.team_number as number}`}
                            </span>
                            <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>
                                {(t.city as string) || '—'}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
