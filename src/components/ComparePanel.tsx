'use client'
import { useTeamMatches } from '@/hooks/useLeaderboard'
import { X, TrendingUp } from 'lucide-react'

interface MatchData { result: string; team_alliance: string; red_score: number; blue_score: number }

function TeamStats({ teamNumber }: { teamNumber: number }) {
    const { data: matches = [], isLoading } = useTeamMatches(teamNumber)
    const typedMatches = matches as MatchData[]
    const wins = typedMatches.filter(m => m.result === 'win').length
    const losses = typedMatches.filter(m => m.result === 'loss').length
    const ties = typedMatches.filter(m => m.result === 'tie').length
    const unplayed = typedMatches.filter(m => m.result === 'unplayed').length
    const scores = typedMatches.map(m => m.team_alliance === 'red' ? m.red_score : m.blue_score).filter(s => s >= 0)
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const best = scores.length ? Math.max(...scores) : 0
    if (isLoading) return <div className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
    return (
        <div className="space-y-2">
            <div className="text-sm font-bold" style={{ color: 'var(--first-blue)' }}>{teamNumber}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{typedMatches.length} matches</div>
            <div className="flex gap-3 text-xs font-semibold">
                <span style={{ color: '#16a34a' }}>{wins}W</span>
                <span style={{ color: 'var(--first-red)' }}>{losses}L</span>
                <span style={{ color: 'var(--text-muted)' }}>{ties}T</span>
                <span style={{ color: 'var(--text-muted)' }}>{unplayed}U</span>
            </div>
            <div className="flex gap-3 text-xs">
                <span>Avg: <strong>{avg}</strong></span>
                <span>Best: <strong style={{ color: 'var(--first-blue)' }}>{best}</strong></span>
            </div>
        </div>
    )
}

export function ComparePanel({ teamA, teamB, onClose }: { teamA: number; teamB: number; onClose: () => void }) {
    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-64 bg-white z-50 flex flex-col drawer-enter shadow-xl"
                style={{ borderLeft: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-1.5">
                        <TrendingUp size={13} style={{ color: 'var(--first-blue)' }} />
                        <span className="text-xs font-bold uppercase tracking-wider">Compare</span>
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    <TeamStats teamNumber={teamA} />
                    <hr style={{ borderColor: 'var(--border)' }} />
                    <TeamStats teamNumber={teamB} />
                </div>
            </div>
        </>
    )
}
