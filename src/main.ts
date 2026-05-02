import { GameEngine } from './gameEngine'
import { saveLevelRecord, getLevelRecords, formatTime, saveTheme, getTheme, getCurrentLevel, saveCurrentLevel, resetProgress } from './storage'
import { LEVEL_CONFIGS } from './types'
import type { Theme, GameState } from './types'

const GRID_SIZE = 6
const CELL_SIZE = 70
const PADDING = 35

let gameEngine: GameEngine | null = null
let currentLevel = 1

function initGame() {
  const savedTheme = getTheme() as Theme
  gameEngine = new GameEngine(savedTheme)

  gameEngine.setGridElement(document.getElementById('game-grid')!)
  gameEngine.setCanvas(document.getElementById('line-canvas')!)
  gameEngine.applyTheme()

  gameEngine.setCallbacks(
    handleStateChange,
    handleLevelComplete,
    handleGameOver
  )

  setupEventListeners()
  updateLevelRecords()
  currentLevel = getCurrentLevel(LEVEL_CONFIGS.length)
}

function setupEventListeners() {
  const startBtn = document.getElementById('start-btn')
  const resetProgressBtn = document.getElementById('reset-progress-btn')
  const pauseBtn = document.getElementById('pause-btn')
  const resumeBtn = document.getElementById('resume-btn')
  const restartBtn = document.getElementById('restart-btn')
  const backToMenuBtn = document.getElementById('back-to-menu-btn')
  const nextLevelBtn = document.getElementById('next-level-btn')
  const replayLevelBtn = document.getElementById('replay-level-btn')
  const resultBackBtn = document.getElementById('result-back-btn')
  const hintBtn = document.getElementById('hint-btn')
  const freezeBtn = document.getElementById('freeze-btn')
  const lightningBtn = document.getElementById('lightning-btn')
  const themeBtns = document.querySelectorAll('.theme-btn')
  const gameGrid = document.getElementById('game-grid')

  startBtn?.addEventListener('click', startGame)
  resetProgressBtn?.addEventListener('click', () => {
    if (confirm('确定要重置所有关卡进度吗？')) {
      resetProgress()
      currentLevel = 1
      updateLevelRecords()
      alert('进度已重置！')
    }
  })
  pauseBtn?.addEventListener('click', () => gameEngine?.togglePause())
  resumeBtn?.addEventListener('click', () => gameEngine?.togglePause())
  restartBtn?.addEventListener('click', restartLevel)
  backToMenuBtn?.addEventListener('click', showStartScreen)
  nextLevelBtn?.addEventListener('click', nextLevel)
  replayLevelBtn?.addEventListener('click', restartLevel)
  resultBackBtn?.addEventListener('click', showStartScreen)
  hintBtn?.addEventListener('click', () => gameEngine?.useHint())
  freezeBtn?.addEventListener('click', () => gameEngine?.useTimeFreeze())
  lightningBtn?.addEventListener('click', () => gameEngine?.useLightning())

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme') as Theme
      gameEngine?.setTheme(theme)
      saveTheme(theme)
      updateLevelRecords()
    })
  })

  gameGrid?.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const pointCell = target.closest('.point-cell')
    if (pointCell) {
      const pointId = parseInt(pointCell.getAttribute('data-point-id')!)
      const points = gameEngine?.getState?.()?.points || []
      const point = points.find(p => p.id === pointId)
      gameEngine?.selectPoint(point || null)
    }
  })

  setupTouchHandling()
}

function setupTouchHandling() {
  const gameGrid = document.getElementById('game-grid')
  const canvas = document.getElementById('line-canvas') as HTMLCanvasElement

  let isDragging = false
  let startPoint: { x: number; y: number } | null = null

  gameGrid?.addEventListener('touchstart', (e) => {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = gameGrid.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const gridX = Math.floor((x - PADDING) / CELL_SIZE)
    const gridY = Math.floor((y - PADDING) / CELL_SIZE)

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
      isDragging = true
      startPoint = { x: gridX, y: gridY }
      
      const points = gameEngine?.getState?.()?.points || []
      const point = points.find(p => p.x === gridX && p.y === gridY && p.visible)
      gameEngine?.selectPoint(point || null)
    }
  })

  gameGrid?.addEventListener('touchmove', (e) => {
    e.preventDefault()
    if (!isDragging || !startPoint) return
    
    const touch = e.touches[0]
    const rect = gameGrid.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top
    const gridX = Math.floor((x - PADDING) / CELL_SIZE)
    const gridY = Math.floor((y - PADDING) / CELL_SIZE)

    if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE && (gridX !== startPoint.x || gridY !== startPoint.y)) {
      const points = gameEngine?.getState?.()?.points || []
      const point = points.find(p => p.x === gridX && p.y === gridY && p.visible)
      if (point) {
        gameEngine?.selectPoint(point)
        isDragging = false
        startPoint = null
      }
    }
  })

  gameGrid?.addEventListener('touchend', () => {
    isDragging = false
    startPoint = null
  })
}

function startGame() {
  currentLevel = getCurrentLevel(LEVEL_CONFIGS.length)
  showGameScreen()
  gameEngine?.startLevel(currentLevel)
}

function restartLevel() {
  showGameScreen()
  gameEngine?.startLevel(currentLevel)
}

function nextLevel() {
  currentLevel++
  if (currentLevel > LEVEL_CONFIGS.length) {
    showWinScreen()
    return
  }
  saveCurrentLevel(currentLevel)
  showGameScreen()
  gameEngine?.startLevel(currentLevel)
}

function showStartScreen() {
  hideAllScreens()
  document.getElementById('start-screen')?.classList.add('active')
}

function showGameScreen() {
  hideAllScreens()
  document.getElementById('game-screen')?.classList.add('active')
}

function showPauseScreen() {
  hideAllScreens()
  document.getElementById('pause-screen')?.classList.add('active')
}

function showResultScreen(won: boolean) {
  hideAllScreens()
  const resultScreen = document.getElementById('result-screen')
  const title = document.getElementById('result-title')
  const score = document.getElementById('result-score')
  const time = document.getElementById('result-time')
  const nextBtn = document.getElementById('next-level-btn')
  const replayBtn = document.getElementById('replay-level-btn')

  if (won) {
    title!.textContent = '恭喜过关！'
    nextBtn!.style.display = currentLevel >= LEVEL_CONFIGS.length ? 'none' : 'inline-block'
  } else {
    title!.textContent = '时间到！'
    nextBtn!.style.display = 'none'
  }

  score!.textContent = `最终得分: ${gameEngine?.getState?.()?.score || 0}`
  const timeUsed = (LEVEL_CONFIGS[currentLevel - 1]?.timeLimit || 90) - (gameEngine?.getState?.()?.timeLeft || 0)
  time!.textContent = `用时: ${formatTime(timeUsed)}`
  
  resultScreen?.classList.add('active')
}

function showWinScreen() {
  hideAllScreens()
  const resultScreen = document.getElementById('result-screen')
  const title = document.getElementById('result-title')
  const score = document.getElementById('result-score')
  const time = document.getElementById('result-time')
  const nextBtn = document.getElementById('next-level-btn')
  const replayBtn = document.getElementById('replay-level-btn')

  title!.textContent = '🎉 恭喜通关！'
  score!.textContent = `总得分: ${gameEngine?.getState?.()?.score || 0}`
  time!.textContent = '你已完成所有关卡！'
  nextBtn!.style.display = 'none'
  replayBtn!.style.display = 'none'
  
  resultScreen?.classList.add('active')
}

function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active')
  })
}

function handleStateChange(state: GameState) {
  document.getElementById('current-level')!.textContent = state.level.toString()
  document.getElementById('score')!.textContent = state.score.toString()
  document.getElementById('combo')!.textContent = state.combo.toString()
  document.getElementById('time')!.textContent = state.timeLeft.toString()

  if (state.isPaused) {
    showPauseScreen()
  }
}

function handleLevelComplete(level: number, time: number, score: number) {
  saveLevelRecord(level, time)
  updateLevelRecords()
  
  if (level >= LEVEL_CONFIGS.length) {
    setTimeout(() => showWinScreen(), 500)
  } else {
    saveCurrentLevel(level + 1)
    setTimeout(() => showResultScreen(true), 500)
  }
}

function handleGameOver(won: boolean) {
  setTimeout(() => showResultScreen(won), 500)
}

function updateLevelRecords() {
  const records = getLevelRecords()
  const container = document.getElementById('level-records')
  let html = ''
  
  for (let i = 1; i <= LEVEL_CONFIGS.length; i++) {
    const record = records.find(r => r.level === i)
    html += `<div class="level-record">关卡 ${i}: ${record ? formatTime(record.time) : '未完成'}</div>`
  }
  
  container!.innerHTML = html
}

window.addEventListener('DOMContentLoaded', initGame)

window.addEventListener('beforeunload', () => {
  gameEngine?.destroy()
})