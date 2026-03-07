'use client'
import { useEvents } from '@/hooks/useLeaderboard'

export function EventFilter({ selectedEvent, onSelect }: { selectedEvent?: string; onSelect: (k?: string) => void }) {
    const { data: events = [] } = useEvents()
    return (
        <select value={selectedEvent ?? ''} onChange={e => onSelect(e.target.value || undefined)}
            className="rounded-md px-2 py-1 text-xs cursor-pointer outline-none"
            style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
            }}>
            <option value="">All Events</option>
            {(events as Array<Record<string, unknown>>).map((e) => (
                <option key={e.event_key as string} value={e.event_key as string}>
                    {(e.short_name as string) ?? (e.name as string)}
                </option>
            ))}
        </select>
    )
}
