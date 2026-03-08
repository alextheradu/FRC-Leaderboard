'use client'
import { useEvents } from '@/hooks/useLeaderboard'
import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Lock, X } from 'lucide-react'

type EventRecord = Record<string, unknown>

const ADMIN_TRIGGER = 'adminRefresh'

export function EventFilter({ selectedEvent, onSelect }: { selectedEvent?: string; onSelect: (k?: string) => void }) {
    const { data: events = [] } = useEvents()
    const allEvents = events as EventRecord[]

    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [showAdminModal, setShowAdminModal] = useState(false)
    const [adminPassword, setAdminPassword] = useState('')
    const [adminStatus, setAdminStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [adminError, setAdminError] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const passwordInputRef = useRef<HTMLInputElement>(null)

    const selectedLabel = selectedEvent
        ? (allEvents.find(e => e.event_key === selectedEvent)?.short_name as string | undefined)
        ?? (allEvents.find(e => e.event_key === selectedEvent)?.name as string | undefined)
        ?? selectedEvent
        : ''

    const isAdminQuery = query === ADMIN_TRIGGER

    const filtered = query.trim() && !isAdminQuery
        ? allEvents.filter(e => {
            const q = query.toLowerCase()
            return (
                (e.event_key as string).toLowerCase().includes(q) ||
                ((e.name as string) ?? '').toLowerCase().includes(q) ||
                ((e.short_name as string) ?? '').toLowerCase().includes(q)
            )
        })
        : (!query.trim() ? allEvents : [])

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

    // Focus password input when modal opens
    useEffect(() => {
        if (showAdminModal) {
            setTimeout(() => passwordInputRef.current?.focus(), 50)
        }
    }, [showAdminModal])

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

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && isAdminQuery) {
            setOpen(false)
            setShowAdminModal(true)
            setQuery('')
            setAdminPassword('')
            setAdminStatus('idle')
            setAdminError('')
        }
    }

    async function handleAdminSubmit(e: React.FormEvent) {
        e.preventDefault()
        setAdminStatus('loading')
        setAdminError('')
        try {
            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'x-sync-secret': adminPassword },
            })
            if (res.ok) {
                setAdminStatus('success')
                setTimeout(() => {
                    setShowAdminModal(false)
                    setAdminPassword('')
                    setAdminStatus('idle')
                }, 1500)
            } else {
                const data = await res.json() as { error?: string }
                setAdminStatus('error')
                setAdminError(data.error ?? 'Unauthorized')
            }
        } catch {
            setAdminStatus('error')
            setAdminError('Network error')
        }
    }

    function closeAdminModal() {
        setShowAdminModal(false)
        setAdminPassword('')
        setAdminStatus('idle')
        setAdminError('')
    }

    const displayValue = open ? query : selectedLabel

    return (
        <>
            <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
                <input
                    type="text"
                    value={displayValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
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
                {open && !isAdminQuery && (
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
                        {filtered.length === 0 && query.trim() && (
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

            {/* Admin password modal */}
            {showAdminModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
                    style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
                    onMouseDown={e => { if (e.target === e.currentTarget) closeAdminModal() }}
                >
                    <div
                        className="rounded-xl p-6 w-80 shadow-2xl"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Lock size={15} style={{ color: 'var(--first-blue)' }} />
                                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Admin Sync</span>
                            </div>
                            <button onClick={closeAdminModal} className="p-1 rounded hover:opacity-60 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                                <X size={14} />
                            </button>
                        </div>

                        {adminStatus === 'success' ? (
                            <div className="text-center py-4">
                                <div className="text-2xl mb-2">✓</div>
                                <p className="text-sm font-medium" style={{ color: 'var(--first-blue)' }}>Sync started!</p>
                            </div>
                        ) : (
                            <form onSubmit={handleAdminSubmit}>
                                <input
                                    ref={passwordInputRef}
                                    type="password"
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    placeholder="Admin password"
                                    className="w-full rounded-md px-3 py-2 text-sm outline-none mb-3"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        border: `1px solid ${adminStatus === 'error' ? 'var(--first-red)' : 'var(--border)'}`,
                                        color: 'var(--text)',
                                    }}
                                    disabled={adminStatus === 'loading'}
                                />
                                {adminStatus === 'error' && (
                                    <p className="text-xs mb-3" style={{ color: 'var(--first-red)' }}>{adminError}</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={adminStatus === 'loading' || !adminPassword}
                                    className="w-full rounded-md py-2 text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                                    style={{ background: 'var(--first-blue)' }}
                                >
                                    {adminStatus === 'loading'
                                        ? <><RefreshCw size={13} className="animate-spin" /> Syncing…</>
                                        : 'Run Sync'
                                    }
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
