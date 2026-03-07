import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoritesStore {
    favorites: number[]
    toggleFavorite: (n: number) => void
    isFavorite: (n: number) => boolean
}

export const useFavorites = create<FavoritesStore>()(
    persist(
        (set, get) => ({
            favorites: [],
            toggleFavorite: (n) => set(state => ({
                favorites: state.favorites.includes(n)
                    ? state.favorites.filter(x => x !== n)
                    : [...state.favorites, n]
            })),
            isFavorite: (n) => get().favorites.includes(n),
        }),
        { name: 'frc-favorites' }
    )
)
