import type { Point, GameState, Theme, LevelConfig } from './types'
import { COLORS, COLOR_HEX, LEVEL_CONFIGS, THEME_CONFIGS } from './types'
import { findPath, findConnectablePair } from './pathFinder'

const GRID_SIZE = 6
const CELL_SIZE = 70
const PADDING = 35

export class GameEngine {
  private state: GameState
  private currentTheme: Theme
  private gridElement: HTMLElement | null = null
  private lineCanvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animationFrameId: number | null = null
  private timerInterval: number | null = null
  private freezeTimer: number | null = null
  private disappearingIntervals: number[] = []
  private movingIntervals: number[] = []
  private onStateChange: ((state: GameState) => void) | null = null
  private onLevelComplete: ((level: number, time: number, score: number) => void) | null = null
  private onGameOver: ((won: boolean) => void) | null = null

  constructor(theme: Theme = 'fresh') {
    this.currentTheme = theme
    this.state = this.createInitialState()
  }

  private createInitialState(): GameState {
    return {
      level: 1,
      score: 0,
      combo: 0,
      timeLeft: 90,
      points: [],
      selectedPoint: null,
      isPaused: false,
      isTimeFrozen: false,
      hintsUsed: 0,
      freezesUsed: 0,
      lightningsUsed: 0
    }
  }

  setCallbacks(
    onStateChange: (state: GameState) => void,
    onLevelComplete: (level: number, time: number, score: number) => void,
    onGameOver: (won: boolean) => void
  ) {
    this.onStateChange = onStateChange
    this.onLevelComplete = onLevelComplete
    this.onGameOver = onGameOver
  }

  setGridElement(element: HTMLElement) {
    this.gridElement = element
  }

  setCanvas(canvas: HTMLCanvasElement) {
    this.lineCanvas = canvas
    this.ctx = canvas.getContext('2d')
    canvas.width = GRID_SIZE * CELL_SIZE + PADDING * 2
    canvas.height = GRID_SIZE * CELL_SIZE + PADDING * 2
  }

  setTheme(theme: Theme) {
    this.currentTheme = theme
    this.applyTheme()
  }

  applyTheme() {
    const config = THEME_CONFIGS[this.currentTheme]
    document.documentElement.style.setProperty('--bg-primary', config.bgPrimary)
    document.documentElement.style.setProperty('--bg-secondary', config.bgSecondary)
    document.documentElement.style.setProperty('--grid-line', config.gridLine)
    document.documentElement.style.setProperty('--point-glow', config.pointGlow)
    document.documentElement.style.setProperty('--text-color', config.textColor)
    document.documentElement.style.setProperty('--button-bg', config.buttonBg)
    document.documentElement.style.setProperty('--button-hover', config.buttonHover)
    document.documentElement.style.setProperty('--line-color', config.lineColor)
  }

  startLevel(level: number) {
    this.stopTimers()
    const config = LEVEL_CONFIGS[level - 1] || LEVEL_CONFIGS[0]
    this.state = {
      ...this.createInitialState(),
      level,
      timeLeft: config.timeLimit,
      points: this.generatePoints(config)
    }
    this.render()
    this.startTimers()
    this.notifyStateChange()
  }

  private generatePoints(config: LevelConfig): Point[] {
    const positions: { x: number; y: number }[] = []
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        positions.push({ x, y })
      }
    }

    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }

    const points: Point[] = []
    const colorPairs: string[] = []
    for (let i = 0; i < config.pairCount; i++) {
      const color = COLORS[i % COLORS.length]
      colorPairs.push(color, color)
    }

    for (let i = colorPairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[colorPairs[i], colorPairs[j]] = [colorPairs[j], colorPairs[i]]
    }

    const disappearingIndices = new Set<number>()
    while (disappearingIndices.size < config.disappearingCount) {
      disappearingIndices.add(Math.floor(Math.random() * config.pairCount * 2))
    }

    const movingIndices = new Set<number>()
    while (movingIndices.size < config.movingCount) {
      const idx = Math.floor(Math.random() * config.pairCount * 2)
      if (!disappearingIndices.has(idx)) {
        movingIndices.add(idx)
      }
    }

    for (let i = 0; i < colorPairs.length; i++) {
      const pos = positions[i]
      points.push({
        id: i,
        x: pos.x,
        y: pos.y,
        color: colorPairs[i] as Point['color'],
        type: disappearingIndices.has(i) ? 'disappearing' : movingIndices.has(i) ? 'moving' : 'normal',
        visible: true,
        originalX: pos.x,
        originalY: pos.y
      })
    }

    return points
  }

  private startTimers() {
    this.timerInterval = window.setInterval(() => {
      if (!this.state.isPaused && !this.state.isTimeFrozen) {
        this.state.timeLeft--
        if (this.state.timeLeft <= 0) {
          this.gameOver(false)
        }
        this.notifyStateChange()
      }
    }, 1000)

    for (const point of this.state.points) {
      if (point.type === 'disappearing') {
        point.disappearingTimer = window.setInterval(() => {
          if (!this.state.isPaused) {
            point.visible = !point.visible
            this.render()
          }
        }, 2000)
        this.disappearingIntervals.push(point.disappearingTimer)
      } else if (point.type === 'moving') {
        point.movingTimer = window.setInterval(() => {
          if (!this.state.isPaused && point.visible) {
            this.movePoint(point)
          }
        }, 3000)
        this.movingIntervals.push(point.movingTimer)
      }
    }
  }

  private movePoint(point: Point) {
    const grid = this.createGrid()
    const emptyPositions: { x: number; y: number }[] = []
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === null) {
          emptyPositions.push({ x, y })
        }
      }
    }

    if (emptyPositions.length > 0) {
      const newPos = emptyPositions[Math.floor(Math.random() * emptyPositions.length)]
      grid[point.y][point.x] = null
      point.x = newPos.x
      point.y = newPos.y
      grid[point.y][point.x] = point
      this.render()
    }
  }

  private stopTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
    if (this.freezeTimer) {
      clearTimeout(this.freezeTimer)
      this.freezeTimer = null
    }
    for (const interval of this.disappearingIntervals) {
      clearInterval(interval)
    }
    for (const interval of this.movingIntervals) {
      clearInterval(interval)
    }
    this.disappearingIntervals = []
    this.movingIntervals = []
  }

  private createGrid(): (Point | null)[][] {
    const grid: (Point | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
    for (const point of this.state.points) {
      if (point.visible) {
        grid[point.y][point.x] = point
      }
    }
    return grid
  }

  selectPoint(point: Point | null) {
    if (!point || !point.visible) {
      this.state.selectedPoint = null
      this.clearCanvas()
      this.render()
      return
    }

    if (!this.state.selectedPoint) {
      this.state.selectedPoint = point
      this.render()
      return
    }

    if (this.state.selectedPoint.id === point.id) {
      this.state.selectedPoint = null
      this.clearCanvas()
      this.render()
      return
    }

    if (this.state.selectedPoint.color !== point.color) {
      this.state.selectedPoint = point
      this.state.combo = 0
      this.render()
      return
    }

    const grid = this.createGrid()
    const pathResult = findPath(grid, this.state.selectedPoint, point)

    if (pathResult.valid) {
      this.animateConnection(this.state.selectedPoint, point, pathResult.points)
      setTimeout(() => {
        this.removePoints(this.state.selectedPoint!, point)
      }, 500)
    } else {
      this.state.selectedPoint = point
      this.state.combo = 0
      this.clearCanvas()
      this.render()
    }
  }

  private animateConnection(p1: Point, p2: Point, path: { x: number; y: number }[]) {
    if (!this.ctx || !this.lineCanvas) return

    const ctx = this.ctx
    const canvas = this.lineCanvas

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = COLOR_HEX[p1.color]
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    ctx.beginPath()
    const startX = PADDING + p1.x * CELL_SIZE + CELL_SIZE / 2
    const startY = PADDING + p1.y * CELL_SIZE + CELL_SIZE / 2
    ctx.moveTo(startX, startY)

    for (const pos of path.slice(1)) {
      const x = PADDING + pos.x * CELL_SIZE + CELL_SIZE / 2
      const y = PADDING + pos.y * CELL_SIZE + CELL_SIZE / 2
      ctx.lineTo(x, y)
    }

    ctx.stroke()

    ctx.shadowColor = COLOR_HEX[p1.color]
    ctx.shadowBlur = 15
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  private removePoints(p1: Point, p2: Point) {
    this.state.points = this.state.points.filter(p => p.id !== p1.id && p.id !== p2.id)
    
    this.state.combo++
    this.state.score += 100
    if (this.state.combo > 1) {
      this.state.score += 50 * (this.state.combo - 1)
    }

    this.state.selectedPoint = null
    this.clearCanvas()
    this.render()
    this.notifyStateChange()

    if (this.state.points.length === 0) {
      this.levelComplete()
    }
  }

  private levelComplete() {
    this.stopTimers()
    const timeUsed = (LEVEL_CONFIGS[this.state.level - 1]?.timeLimit || 90) - this.state.timeLeft
    if (this.onLevelComplete) {
      this.onLevelComplete(this.state.level, timeUsed, this.state.score)
    }
  }

  private gameOver(won: boolean) {
    this.stopTimers()
    if (this.onGameOver) {
      this.onGameOver(won)
    }
  }

  togglePause() {
    this.state.isPaused = !this.state.isPaused
    this.notifyStateChange()
  }

  useHint() {
    const pair = findConnectablePair(this.state.points)
    if (pair) {
      this.state.hintsUsed++
      this.highlightPoints(pair)
    }
  }

  private highlightPoints(points: [Point, Point]) {
    this.render(points)
    setTimeout(() => {
      this.render()
    }, 2000)
  }

  useTimeFreeze() {
    if (this.state.isTimeFrozen) return
    this.state.isTimeFrozen = true
    this.state.freezesUsed++
    this.notifyStateChange()
    
    this.freezeTimer = window.setTimeout(() => {
      this.state.isTimeFrozen = false
      this.notifyStateChange()
    }, 5000)
  }

  useLightning() {
    const pair = findConnectablePair(this.state.points)
    if (pair) {
      this.state.lightningsUsed++
      const grid = this.createGrid()
      const pathResult = findPath(grid, pair[0], pair[1])
      if (pathResult.valid) {
        this.animateConnection(pair[0], pair[1], pathResult.points)
        setTimeout(() => {
          this.removePoints(pair[0], pair[1])
        }, 500)
      }
    }
  }

  private clearCanvas() {
    if (this.ctx && this.lineCanvas) {
      this.ctx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height)
    }
  }

  private render(highlightedPoints: [Point, Point] | null = null) {
    if (!this.gridElement) return

    const config = THEME_CONFIGS[this.currentTheme]
    const isNeon = this.currentTheme === 'neon'

    let html = `<div class="grid-container" style="background: ${config.bgSecondary}; border-color: ${config.gridLine};">`
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const point = this.state.points.find(p => p.x === x && p.y === y && p.visible)
        let cellClass = 'grid-cell'
        
        if (point) {
          const isSelected = this.state.selectedPoint?.id === point.id
          const isHighlighted = highlightedPoints?.some(p => p.id === point.id)
          const colorHex = COLOR_HEX[point.color]
          
          let pointStyle = `background: ${colorHex};`
          if (isSelected || isHighlighted) {
            pointStyle += ` transform: scale(1.2); box-shadow: 0 0 20px ${colorHex};`
          }
          if (isNeon) {
            pointStyle += ` box-shadow: 0 0 15px ${colorHex}, 0 0 30px ${colorHex};`
          }
          if (point.type === 'disappearing') {
            pointStyle += ' animation: pulse 1s infinite;'
          }
          if (point.type === 'moving') {
            pointStyle += ' animation: bounce 0.5s ease-in-out infinite alternate;'
          }

          html += `<div class="${cellClass} point-cell" style="${pointStyle}" data-point-id="${point.id}"></div>`
        } else {
          html += `<div class="${cellClass}"></div>`
        }
      }
    }
    
    html += '</div>'
    this.gridElement.innerHTML = html
  }

  private notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state })
    }
  }

  getState(): GameState {
    return { ...this.state }
  }

  destroy() {
    this.stopTimers()
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }
}