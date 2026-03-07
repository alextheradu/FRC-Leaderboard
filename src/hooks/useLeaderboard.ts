import { useQuery } from '@tanstack/react-query'

export function useLeaderboard(eventKey?: string, limit = 100, offset = 0) {
    return useQuery({
        queryKey: ['leaderboard', eventKey ?? 'global', limit, offset],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: String(limit),
                offset: String(offset),
            })
            const url = eventKey
                ? `/api/events/${eventKey}/leaderboard?${params.toString()}`
                : `/api/leaderboard?${params.toString()}`
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch leaderboard')
            return res.json()
        },
    })
}

export function useEvents(year?: number) {
    return useQuery({
        queryKey: ['events', year],
        queryFn: async () => {
            const res = await fetch(`/api/events${year ? `?year=${year}` : ''}`)
            return res.json()
        },
        staleTime: 60 * 60 * 1000,
    })
}

export function useTeamMatches(teamNumber: number | null) {
    return useQuery({
        queryKey: ['team-matches', teamNumber],
        queryFn: async () => {
            const res = await fetch(`/api/teams/${teamNumber}/matches`)
            return res.json()
        },
        enabled: teamNumber !== null,
    })
}
