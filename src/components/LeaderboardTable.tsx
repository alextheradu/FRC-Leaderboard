'use client'
import { RankBadge } from './RankBadge'
import { AllianceCell } from './AllianceCell'
import { ExternalLink, Youtube } from 'lucide-react'

interface Row {
    rank: number; score: number; team_numbers: number[]; match_key: string;
    event_key: string; event_name: string; alliance: 'red' | 'blue';
    achieved_at: number; video_url?: string
}
interface Props { rows: Row[]; highlightTeams?: number[]; onTeamClick?: (n: number) => void; isLoading?: boolean }

const SKELETON_COUNT = 15

function SkeletonRows() {
    return (
        <>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <tr key={i} className="border-b" style={{ borderColor: 'var(--border)', opacity: 1 - i * 0.04 }}>
                    <td className="py-2 px-3">
                        <div className="h-5 w-6 rounded animate-pulse" style={{ background: 'var(--bg-hover)' }} />
                    </td>
                    <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                            <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: `${110 + (i % 3) * 24}px`, animationDelay: `${i * 60}ms` }} />
                        </div>
                    </td>
                    <td className="py-2 px-3">
                        <div className="h-4 w-10 rounded animate-pulse ml-auto" style={{ background: 'var(--bg-hover)', animationDelay: `${i * 60 + 30}ms` }} />
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: `${80 + (i % 4) * 20}px`, animationDelay: `${i * 60}ms` }} />
                    </td>
                    <td className="py-2 px-2 hidden lg:table-cell" />
                    <td className="py-2 px-3 hidden lg:table-cell" />
                    <td className="py-2 px-2 hidden md:table-cell" />
                </tr>
            ))}
        </>
    )
}

export function LeaderboardTable({ rows, highlightTeams = [], onTeamClick, isLoading }: Props) {
    if (!isLoading && !rows.length) return (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
            No data yet — hit the sync button to populate.
        </div>
    )
    return (
        <table className="w-full text-sm table-fixed">
            <thead>
                <tr className="text-left text-xs uppercase tracking-wider border-b-2" style={{
                    color: 'var(--text-muted)', borderColor: 'var(--border-strong)',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                }}>
                    <th className="py-2 px-3 w-10">#</th>
                    <th className="py-2 px-3 md:w-[220px] lg:w-[240px]">Alliance</th>
                    <th className="py-2 px-3 text-right w-20">Score</th>
                    <th className="py-2 px-2 hidden md:table-cell md:w-48 lg:w-56">Event</th>
                    <th className="py-2 px-2 hidden lg:table-cell w-24">Match</th>
                    <th className="py-2 px-3 hidden lg:table-cell w-28">Date</th>
                    <th className="py-2 px-2 hidden md:table-cell w-20"></th>
                </tr>
            </thead>
            <tbody>
                {isLoading && !rows.length
                    ? <SkeletonRows />
                    : rows.map((row, i) => {
                        const highlighted = highlightTeams.length > 0 && row.team_numbers.some(n => highlightTeams.includes(n))
                        return (
                            <tr key={row.match_key + row.alliance}
                                className="border-b transition-colors"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: highlighted ? 'rgba(0,102,179,0.05)' : i % 2 === 0 ? 'var(--bg)' : 'var(--bg-secondary)',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = highlighted ? 'rgba(0,102,179,0.08)' : 'var(--bg-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = highlighted ? 'rgba(0,102,179,0.05)' : i % 2 === 0 ? 'var(--bg)' : 'var(--bg-secondary)')}>
                                <td className="py-2 px-3"><RankBadge rank={row.rank} /></td>
                                <td className="py-2 px-3 whitespace-nowrap md:w-[220px] lg:w-[240px]">
                                    <AllianceCell teamNumbers={row.team_numbers} alliance={row.alliance} onTeamClick={onTeamClick} />
                                </td>
                                <td className="py-2 px-3 text-right">
                                    <span className="font-bold tabular-nums"
                                        style={{ color: row.alliance === 'red' ? 'var(--first-red)' : 'var(--first-blue)' }}>
                                        {row.score}
                                    </span>
                                </td>
                                <td className="py-2 px-2 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="block truncate">{row.event_name}</span>
                                </td>
                                <td className="py-2 px-2 hidden lg:table-cell text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {row.match_key.split('_')[1]?.toUpperCase()}
                                </td>
                                <td className="py-2 px-3 hidden lg:table-cell text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {row.achieved_at ? new Date(row.achieved_at * 1000).toLocaleDateString() : '—'}
                                </td>
                                <td className="py-2 px-2 hidden md:table-cell">
                                    <div className="flex items-center gap-2">
                                        {row.video_url && (
                                            <a href={row.video_url} target="_blank" rel="noopener noreferrer"
                                                aria-label="Open match video on YouTube"
                                                className="inline-flex items-center justify-center p-1 hover:opacity-70 transition-opacity"
                                                style={{ color: 'var(--first-red)' }}>
                                                <Youtube size={17} />
                                            </a>
                                        )}
                                        <a href={`https://www.thebluealliance.com/match/${row.match_key}`} target="_blank" rel="noopener noreferrer"
                                            aria-label="Open match on The Blue Alliance"
                                            className="inline-flex items-center justify-center p-1 hover:opacity-70 transition-opacity"
                                            style={{ color: 'var(--text-muted)' }}>
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        )
                    })
                }
            </tbody>
        </table>
    )
}
