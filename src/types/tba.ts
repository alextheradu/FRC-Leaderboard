export interface TBATeam {
    team_number: number
    nickname: string
    city: string
    state_prov: string
    country: string
    website: string
    rookie_year: number
}

export interface TBAEvent {
    key: string
    name: string
    short_name: string
    city: string
    state_prov: string
    country: string
    year: number
    start_date: string
    end_date: string
    event_type: number
}

export interface TBAMatchAlliance {
    score: number
    team_keys: string[]
}

export interface TBAMatch {
    key: string
    event_key: string
    comp_level: 'qm' | 'ef' | 'qf' | 'sf' | 'f'
    match_number: number
    set_number: number
    alliances: {
        red: TBAMatchAlliance
        blue: TBAMatchAlliance
    }
    winning_alliance: 'red' | 'blue' | ''
    actual_time: number | null
    post_result_time: number | null
    videos?: Array<{ type: string; key: string }>
}
