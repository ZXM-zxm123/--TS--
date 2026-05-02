export type Color = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple'
export type PointType = 'normal' | 'disappearing' | 'moving'
export type Theme = 'fresh' | 'dark' | 'neon'

export interface Point {
  id: number
  x: number
  y: number
  color: Color
  type: PointType
  visible: boolean
  originalX: number
  originalY: number
  disappearingTimer?: number
  movingTimer?: number
}

export interface Path {
  points: { x: number; y: number }[]
  valid: boolean
}

export interface LevelConfig {
  level: number
  pairCount: number
  timeLimit: number
  disappearingCount: number
  movingCount: number
}

export interface GameState {
  level: number
  score: number
  combo: number
  timeLeft: number
  points: Point[]
  selectedPoint: Point | null
  isPaused: boolean
  isTimeFrozen: boolean
  hintsUsed: number
  freezesUsed: number
  lightningsUsed: number
}

export interface ThemeConfig {
  name: string
  bgPrimary: string
  bgSecondary: string
  gridLine: string
  pointGlow: string
  textColor: string
  buttonBg: string
  buttonHover: string
  lineColor: string
}

export const COLORS: Color[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple']

export const COLOR_HEX: Record<Color, string> = {
  red: '#FF6B6B',
  orange: '#FFA94D',
  yellow: '#FFE066',
  green: '#69DB7C',
  blue: '#74C0FC',
  purple: '#B197FC'
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, pairCount: 6, timeLimit: 90, disappearingCount: 1, movingCount: 1 },
  { level: 2, pairCount: 8, timeLimit: 90, disappearingCount: 2, movingCount: 2 },
  { level: 3, pairCount: 10, timeLimit: 80, disappearingCount: 2, movingCount: 2 },
  { level: 4, pairCount: 12, timeLimit: 80, disappearingCount: 3, movingCount: 3 },
  { level: 5, pairCount: 14, timeLimit: 70, disappearingCount: 3, movingCount: 3 }
]

export const THEME_CONFIGS: Record<Theme, ThemeConfig> = {
  fresh: {
    name: '清新',
    bgPrimary: '#F8FAFC',
    bgSecondary: '#E2E8F0',
    gridLine: '#CBD5E1',
    pointGlow: 'rgba(148, 163, 184, 0.3)',
    textColor: '#1E293B',
    buttonBg: '#3B82F6',
    buttonHover: '#2563EB',
    lineColor: '#3B82F6'
  },
  dark: {
    name: '暗夜',
    bgPrimary: '#0F172A',
    bgSecondary: '#1E293B',
    gridLine: '#334155',
    pointGlow: 'rgba(71, 85, 105, 0.3)',
    textColor: '#F1F5F9',
    buttonBg: '#6366F1',
    buttonHover: '#4F46E5',
    lineColor: '#6366F1'
  },
  neon: {
    name: '霓虹',
    bgPrimary: '#0D0D0D',
    bgSecondary: '#1A1A2E',
    gridLine: '#16213E',
    pointGlow: 'rgba(131, 96, 195, 0.5)',
    textColor: '#E0E0E0',
    buttonBg: '#8B5CF6',
    buttonHover: '#7C3AED',
    lineColor: '#8B5CF6'
  }
}