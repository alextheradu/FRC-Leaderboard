'use client'
import { SearchBar } from './SearchBar'
import { Star, RefreshCw } from 'lucide-react'

interface Props {
    onTeamSelect: (n: number) => void
    onShowFavorites: () => void
    showingFavorites: boolean
    onSync?: () => void
    isSyncing?: boolean
}

export function Header({ onTeamSelect, onShowFavorites, showingFavorites, onSync, isSyncing }: Props) {
    return (
        <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-4">
                <span className="font-bold text-sm tracking-wide shrink-0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    <span style={{ color: 'var(--first-blue)' }}>FRC</span>
                    <span className="mx-0.5" style={{ color: 'var(--text-muted)' }}>/</span>
                    <span style={{ color: 'var(--text)' }}>Leaderboard</span>
                </span>

                <div className="flex-1 max-w-sm"><SearchBar onTeamSelect={onTeamSelect} /></div>

                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={onShowFavorites}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: showingFavorites ? 'var(--first-blue)' : 'var(--text-muted)' }}>
                        <Star size={15} className={showingFavorites ? 'fill-current' : ''} />
                    </button>
                    {onSync && (
                        <button onClick={onSync} disabled={isSyncing}
                            className="p-1.5 rounded transition-colors disabled:opacity-30"
                            style={{ color: 'var(--text-muted)' }}>
                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    )
}
