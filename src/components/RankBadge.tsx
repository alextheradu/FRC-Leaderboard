export function RankBadge({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-xs font-bold" style={{ color: '#c59400' }}>1st</span>
    if (rank === 2) return <span className="text-xs font-bold" style={{ color: '#7a7a7a' }}>2nd</span>
    if (rank === 3) return <span className="text-xs font-bold" style={{ color: '#a0714b' }}>3rd</span>
    return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{rank}</span>
}
