const TBA_BASE = process.env.TBA_BASE_URL || 'https://www.thebluealliance.com/api/v3'

export class TBAClient {
    private etags = new Map<string, string>()

    constructor(private apiKey: string) { }

    async get<T>(path: string): Promise<T | null> {
        const url = `${TBA_BASE}${path}`
        const headers: Record<string, string> = {
            'X-TBA-Auth-Key': this.apiKey,
            'Accept': 'application/json',
        }
        const etag = this.etags.get(path)
        if (etag) headers['If-None-Match'] = etag

        const res = await fetch(url, { headers })
        if (res.status === 304) return null
        if (!res.ok) throw new Error(`TBA API error: ${res.status} for ${path}`)

        const newEtag = res.headers.get('etag')
        if (newEtag) this.etags.set(path, newEtag)
        return res.json() as Promise<T>
    }
}

export function getTBAClient(): TBAClient {
    const key = process.env.TBA_API_KEY
    if (!key) throw new Error('TBA_API_KEY environment variable not set')
    return new TBAClient(key)
}

export function parseTeamNumber(teamKey: string): number {
    return parseInt(teamKey.replace('frc', ''), 10)
}
