const LEVEL_RECORDS_KEY = 'rainbow_connect_level_records'
const CURRENT_LEVEL_KEY = 'rainbow_connect_current_level'

export interface LevelRecord {
  level: number
  time: number
  date: string
}

export function saveLevelRecord(level: number, time: number): void {
  const records = getLevelRecords()
  const existingIndex = records.findIndex(r => r.level === level)
  
  if (existingIndex >= 0) {
    if (time < records[existingIndex].time) {
      records[existingIndex] = { level, time, date: new Date().toISOString() }
    }
  } else {
    records.push({ level, time, date: new Date().toISOString() })
  }
  
  localStorage.setItem(LEVEL_RECORDS_KEY, JSON.stringify(records))
}

export function getLevelRecords(): LevelRecord[] {
  const data = localStorage.getItem(LEVEL_RECORDS_KEY)
  return data ? JSON.parse(data) : []
}

export function getBestTime(level: number): number | null {
  const records = getLevelRecords()
  const record = records.find(r => r.level === level)
  return record ? record.time : null
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const THEME_KEY = 'rainbow_connect_theme'

export function saveTheme(theme: string): void {
  localStorage.setItem(THEME_KEY, theme)
}

export function getTheme(): string {
  return localStorage.getItem(THEME_KEY) || 'fresh'
}

export function saveCurrentLevel(level: number): void {
  localStorage.setItem(CURRENT_LEVEL_KEY, level.toString())
}

export function getCurrentLevel(maxLevel: number): number {
  const savedLevel = localStorage.getItem(CURRENT_LEVEL_KEY)
  const level = savedLevel ? parseInt(savedLevel, 10) : 1
  if (isNaN(level) || level < 1 || level > maxLevel) {
    return 1
  }
  return level
}

export function resetProgress(): void {
  localStorage.removeItem(CURRENT_LEVEL_KEY)
  localStorage.removeItem(LEVEL_RECORDS_KEY)
}