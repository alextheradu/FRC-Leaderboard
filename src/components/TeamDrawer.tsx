'use client'
import { useTeamMatches } from '@/hooks/useLeaderboard'
import { useFavorites } from '@/hooks/useFavorites'
import { X, Star, TrendingUp, Youtube, ExternalLink } from 'lucide-react'

interface MatchData {
    match_key: string; event_name: string; team_alliance: string;
    red_score: number; blue_score: number; result: string; video_url?: string
}
interface Props { teamNumber: number; onClose: () => void; onCompare?: (n: number) => void }

export function TeamDrawer({ teamNumber, onClose, onCompare }: Props) {
    const { data: matches = [], isLoading } = useTeamMatches(teamNumber)
    const typedMatches = matches as MatchData[]
    const { isFavorite, toggleFavorite } = useFavorites()
    const fav = isFavorite(teamNumber)
    const wins = typedMatches.filter(m => m.result === 'win').length
    const losses = typedMatches.filter(m => m.result === 'loss').length
    const ties = typedMatches.filter(m => m.result === 'tie').length
    const unplayed = typedMatches.filter(m => m.result === 'unplayed').length

    return (
        <>
            <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-96 bg-white z-50 flex flex-col drawer-enter shadow-xl"
                style={{ borderLeft: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold" style={{ color: 'var(--first-blue)' }}>{teamNumber}</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{typedMatches.length} matches</span>
                        <div className="flex items-center gap-1 text-xs font-semibold">
                            <span style={{ color: '#16a34a' }}>{wins}W</span>
                            <span style={{ color: 'var(--first-red)' }}>{losses}L</span>
                            <span style={{ color: 'var(--text-muted)' }}>{ties}T</span>
                            <span style={{ color: 'var(--text-muted)' }}>{unplayed}U</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                        <button onClick={() => toggleFavorite(teamNumber)} className="p-1.5" style={{ color: fav ? 'var(--first-blue)' : 'var(--text-muted)' }}>
                            <Star size={14} className={fav ? 'fill-current' : ''} />
                        </button>
                        {onCompare && <button onClick={() => onCompare(teamNumber)} className="p-1.5" style={{ color: 'var(--text-muted)' }}><TrendingUp size={14} /></button>}
                        <button onClick={onClose} className="p-1.5" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-6 text-center text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>Loading...</div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-white border-b" style={{ borderColor: 'var(--border)' }}>
                                <tr style={{ color: 'var(--text-muted)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                                    <th className="text-left py-2 px-3 font-semibold uppercase tracking-wider">Match</th>
                                    <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider">Event</th>
                                    <th className="text-right py-2 px-3 font-semibold uppercase tracking-wider">Score</th>
                                    <th className="text-right py-2 px-2 font-semibold uppercase tracking-wider">Result</th>
                                    <th className="py-2 px-2 w-14"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {typedMatches.map((m, i) => {
                                    const score = m.team_alliance === 'red' ? m.red_score : m.blue_score
                                    const rc = m.result === 'win' ? '#16a34a' : m.result === 'loss' ? 'var(--first-red)' : 'var(--text-muted)'
                                    const resultLabel = m.result === 'unplayed' ? 'not played' : m.result
                                    return (
                                        <tr key={m.match_key} className="border-b transition-colors"
                                            style={{
                                                borderColor: 'var(--border)',
                                                borderLeft: `2px solid ${m.team_alliance === 'red' ? 'var(--first-red)' : 'var(--first-blue)'}`,
                                                background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-secondary)',
                                            }}>
                                            <td className="py-1.5 px-3 font-mono" style={{ color: 'var(--text-muted)' }}>
                                                {m.match_key.split('_')[1]?.toUpperCase()}
                                            </td>
                                            <td className="py-1.5 px-2 truncate max-w-[100px]" style={{ color: 'var(--text-muted)' }}>{m.event_name}</td>
                                            <td className="py-1.5 px-3 text-right font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                                                {score >= 0 ? score : '—'}
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-bold uppercase" style={{ color: rc }}>{resultLabel}</td>
                                            <td className="py-1.5 px-2">
                                                <div className="flex items-center gap-1.5">
                                                    {m.video_url && (
                                                        <a href={m.video_url} target="_blank" rel="noopener noreferrer"
                                                            aria-label="Open match video on YouTube"
                                                            className="inline-flex items-center justify-center p-0.5"
                                                            style={{ color: 'var(--first-red)' }}>
                                                            <Youtube size={14} />
                                                        </a>
                                                    )}
                                                    <a href={`https://www.thebluealliance.com/match/${m.match_key}`} target="_blank" rel="noopener noreferrer"
                                                        aria-label="Open match on The Blue Alliance"
                                                        className="inline-flex items-center justify-center p-0.5"
                                                        style={{ color: 'var(--text-muted)' }}>
                                                        <ExternalLink size={13} />
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    )
}
