import { createContext, useContext } from 'react'
import type { Lang } from '../types'
import type { GameData } from './data'

export const AppCtx = createContext<{ data: GameData; lang: Lang }>(null as never)
export const useApp = () => useContext(AppCtx)
