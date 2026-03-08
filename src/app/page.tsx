'use client'
import { useEffect, useState } from 'react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useFavorites } from '@/hooks/useFavorites'
import { Header } from '@/components/Header'
import { LeaderboardTable } from '@/components/LeaderboardTable'
import { EventFilter } from '@/components/EventFilter'
import { TeamDrawer } from '@/components/TeamDrawer'
import { ComparePanel } from '@/components/ComparePanel'
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

type LeaderboardRow = {
  rank: number; score: number; team_numbers: number[]; match_key: string;
  event_key: string; event_name: string; alliance: 'red' | 'blue';
  achieved_at: number; video_url?: string
}

const PAGE_SIZE = 100

export default function HomePage() {
  const [selectedEvent, setSelectedEvent] = useState<string>()
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [compareTeams, setCompareTeams] = useState<[number, number] | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [offset, setOffset] = useState(0)
  const [includePenalties, setIncludePenalties] = useState(false)

  const { data: leaderboardData, isLoading } = useLeaderboard(selectedEvent, PAGE_SIZE, offset, includePenalties)
  const { favorites } = useFavorites()
  const typedRows = (leaderboardData?.rows ?? []) as LeaderboardRow[]
  const totalPlaces = (leaderboardData?.total ?? 0) as number
  const displayRows = showFavorites ? typedRows.filter(r => r.team_numbers.some(n => favorites.includes(n))) : typedRows

  const handleSync = async () => {
    setIsSyncing(true)
    try { await fetch('/api/sync', { method: 'POST' }) }
    finally { setIsSyncing(false) }
  }

  const handleTeamSelect = async (teamNumber: number) => {
    setSelectedTeam(teamNumber)
    setShowFavorites(false)
    try {
      const params = new URLSearchParams()
      if (selectedEvent) params.set('eventKey', selectedEvent)
      params.set('includePenalties', String(includePenalties))
      const res = await fetch(`/api/teams/${teamNumber}/placement?${params.toString()}`)
      if (!res.ok) return
      const data = await res.json() as { rank: number }
      const targetOffset = Math.floor((Math.max(data.rank, 1) - 1) / PAGE_SIZE) * PAGE_SIZE
      setOffset(targetOffset)
    } catch {
      // Keep current window if placement lookup fails.
    }
  }

  const handleCompareRequest = (teamNumber: number) => {
    if (selectedTeam && selectedTeam !== teamNumber) {
      setCompareTeams([selectedTeam, teamNumber])
    }
  }

  useEffect(() => {
    setOffset(0)
  }, [selectedEvent])

  useEffect(() => {
    setOffset(0)
  }, [includePenalties])

  const displayStart = typedRows.length ? offset + 1 : 0
  const displayEnd = offset + typedRows.length
  const canGoUp = offset > 0
  const canGoDown = offset + PAGE_SIZE < totalPlaces

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Header
        onTeamSelect={handleTeamSelect}
        onShowFavorites={() => setShowFavorites(v => !v)}
        showingFavorites={showFavorites}
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      <main className="max-w-7xl mx-auto px-4 py-5">
        {/* Controls */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {showFavorites ? 'Favorites' : selectedEvent ? 'Event Leaderboard' : 'Global Leaderboard'}
            </h1>
            <EventFilter selectedEvent={selectedEvent} onSelect={setSelectedEvent} />
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={includePenalties}
                onChange={e => setIncludePenalties(e.target.checked)}
                className="rounded"
                style={{ accentColor: 'var(--first-blue)', width: '14px', height: '14px' }}
              />
              Include penalties
            </label>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap justify-end" style={{ color: 'var(--text-muted)' }}>
            {isLoading && <RefreshCw size={12} className="animate-spin" />}
            <span>{showFavorites ? `${displayRows.length} favorites` : `${displayStart}-${displayEnd} of ${totalPlaces}`}</span>
            {!showFavorites && (
              <>
                <button
                  onClick={() => setOffset(v => Math.max(0, v - PAGE_SIZE))}
                  disabled={!canGoUp}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded disabled:opacity-35"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <ChevronUp size={12} />
                  Up
                </button>
                <button
                  onClick={() => setOffset(v => Math.min(v + PAGE_SIZE, Math.max(totalPlaces - PAGE_SIZE, 0)))}
                  disabled={!canGoDown}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded disabled:opacity-35"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  <ChevronDown size={12} />
                  Down
                </button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <LeaderboardTable
            rows={displayRows}
            highlightTeams={selectedTeam ? [selectedTeam] : favorites}
            onTeamClick={setSelectedTeam}
          />
        </div>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          Data from The Blue Alliance · Auto-syncs weekends
        </p>
      </main>

      {selectedTeam !== null && (
        <TeamDrawer
          teamNumber={selectedTeam}
          onClose={() => setSelectedTeam(null)}
          onCompare={handleCompareRequest}
        />
      )}

      {compareTeams && (
        <ComparePanel teamA={compareTeams[0]} teamB={compareTeams[1]} onClose={() => setCompareTeams(null)} />
      )}
    </div>
  )
}
