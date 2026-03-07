interface Props { teamNumber: number; size?: number; className?: string; base64?: string }
export function TeamAvatar({ teamNumber, size = 32, className = '', base64 }: Props) {
    if (base64) {
        return <img src={`data:image/png;base64,${base64}`} alt={`Team ${teamNumber}`}
            width={size} height={size} className={`rounded object-contain ${className}`} />
    }
    return (
        <div className={`rounded flex items-center justify-center font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0 ${className}`}
            style={{ width: size, height: size, fontSize: size * 0.28 }}>
            {teamNumber}
        </div>
    )
}
