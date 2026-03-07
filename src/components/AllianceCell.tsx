'use client'
import { useFavorites } from '@/hooks/useFavorites'
import { Star } from 'lucide-react'

interface Props { teamNumbers: number[]; alliance: 'red' | 'blue'; onTeamClick?: (n: number) => void }

export function AllianceCell({ teamNumbers, alliance, onTeamClick }: Props) {
    const { isFavorite, toggleFavorite } = useFavorites()
    const color = alliance === 'red' ? 'var(--first-red)' : 'var(--first-blue)'

    return (
        <div className="flex items-center gap-0.5">
            {teamNumbers.map((num, idx) => (
                <span key={num} className="inline-flex items-center">
                    {idx > 0 && <span className="mx-0.5" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>·</span>}
                    <button onClick={() => onTeamClick?.(num)}
                        className="text-xs font-semibold hover:underline underline-offset-2"
                        style={{ color }}>
                        {num}
                    </button>
                    <button onClick={() => toggleFavorite(num)} className="ml-px opacity-40 hover:opacity-100 transition-opacity">
                        <Star size={8} style={{ color: isFavorite(num) ? 'var(--first-blue)' : 'var(--text-muted)' }}
                            className={isFavorite(num) ? 'fill-current' : ''} />
                    </button>
                </span>
            ))}
        </div>
    )
}
