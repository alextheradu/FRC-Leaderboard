'use client'
import { useEvents } from '@/hooks/useLeaderboard'
import { useEffect, useRef, useState } from 'react'

type EventRecord = Record<string, unknown>

export function EventFilter({ selectedEvent, onSelect }: { selectedEvent?: string; onSelect: (k?: string) => void }) {
    const { data: events = [] } = useEvents()
    const allEvents = events as EventRecord[]

    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Derive label of selected event for display when input is blurred
    const selectedLabel = selectedEvent
        ? (allEvents.find(e => e.event_key === selectedEvent)?.short_name as string | undefined)
        ?? (allEvents.find(e => e.event_key === selectedEvent)?.name as string | undefined)
        ?? selectedEvent
        : ''

    // Filter by name, short_name, or event_key
    const filtered = query.trim()
        ? allEvents.filter(e => {
            const q = query.toLowerCase()
            return (
                (e.event_key as string).toLowerCase().includes(q) ||
                ((e.name as string) ?? '').toLowerCase().includes(q) ||
                ((e.short_name as string) ?? '').toLowerCase().includes(q)
            )
        })
        : allEvents

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    function handleSelect(key?: string) {
        onSelect(key)
        setOpen(false)
        setQuery('')
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        setQuery(e.target.value)
        setOpen(true)
    }

    function handleFocus() {
        setOpen(true)
    }

    const displayValue = open ? query : selectedLabel

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            <input
                type="text"
                value={displayValue}
                onChange={handleInputChange}
                onFocus={handleFocus}
                placeholder={selectedEvent ? selectedLabel : 'All Events'}
                className="rounded-md px-2 py-1 text-xs outline-none"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    width: '160px',
                    cursor: 'text',
                }}
            />
            {open && (
                <div
                    className="rounded-md"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        zIndex: 100,
                        minWidth: '240px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    }}
                >
                    {/* "All events" option */}
                    <button
                        onMouseDown={() => handleSelect(undefined)}
                        className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                        style={{
                            color: !selectedEvent ? 'var(--first-blue)' : 'var(--text-secondary)',
                            background: !selectedEvent ? 'rgba(0,102,179,0.06)' : 'transparent',
                            fontWeight: !selectedEvent ? 600 : 400,
                        }}
                    >
                        All Events
                    </button>
                    {filtered.length === 0 && (
                        <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                            No events match
                        </div>
                    )}
                    {filtered.map(e => {
                        const key = e.event_key as string
                        const label = (e.short_name as string) ?? (e.name as string)
                        const isSelected = key === selectedEvent
                        return (
                            <button
                                key={key}
                                onMouseDown={() => handleSelect(key)}
                                className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                                style={{
                                    color: isSelected ? 'var(--first-blue)' : 'var(--text)',
                                    background: isSelected ? 'rgba(0,102,179,0.06)' : 'transparent',
                                    fontWeight: isSelected ? 600 : 400,
                                }}
                                onMouseEnter={ev => {
                                    if (!isSelected) (ev.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
                                }}
                                onMouseLeave={ev => {
                                    (ev.currentTarget as HTMLButtonElement).style.background = isSelected ? 'rgba(0,102,179,0.06)' : 'transparent'
                                }}
                            >
                                <span className="block truncate">{label}</span>
                                <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.7em' }}>{key}</span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
