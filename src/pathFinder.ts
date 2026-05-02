import type { Point } from './types'

const GRID_SIZE = 6

export function findPath(
  grid: (Point | null)[][],
  start: Point,
  end: Point
): { points: { x: number; y: number }[]; valid: boolean } {
  const visited = new Map<string, { x: number; y: number; prev: string | null }>()
  const queue: { x: number; y: number; prev: string | null; turns: number }[] = [
    { x: start.x, y: start.y, prev: null, turns: 0 }
  ]

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ]

  while (queue.length > 0) {
    const current = queue.shift()!
    const key = `${current.x},${current.y}`

    if (visited.has(key)) continue
    visited.set(key, { x: current.x, y: current.y, prev: current.prev })

    if (current.x === end.x && current.y === end.y) {
      return { points: reconstructPath(visited, key), valid: true }
    }

    for (const dir of directions) {
      let nx = current.x
      let ny = current.y

      while (true) {
        nx += dir.dx
        ny += dir.dy

        if (nx < -1 || nx > GRID_SIZE || ny < -1 || ny > GRID_SIZE) break

        const isEnd = nx === end.x && ny === end.y
        const hasPoint = nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && grid[ny][nx] !== null

        if (hasPoint && !isEnd) break

        const newTurns = current.prev !== null ?
          getTurnCount(current.prev, `${current.x},${current.y}`, `${nx},${ny}`) : 0

        if (newTurns > 2) break

        if (!visited.has(`${nx},${ny}`)) {
          queue.push({ x: nx, y: ny, prev: key, turns: newTurns })
        }

        if (isEnd) break
      }
    }
  }

  return { points: [], valid: false }
}

function getTurnCount(prev: string, current: string, next: string): number {
  const [px, py] = prev.split(',').map(Number)
  const [cx, cy] = current.split(',').map(Number)
  const [nx, ny] = next.split(',').map(Number)

  const dir1x = cx - px
  const dir1y = cy - py
  const dir2x = nx - cx
  const dir2y = ny - cy

  if ((dir1x !== dir2x) || (dir1y !== dir2y)) {
    return 1
  }
  return 0
}

function reconstructPath(visited: Map<string, { x: number; y: number; prev: string | null }>, endKey: string): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = []
  let currentKey = endKey

  while (currentKey) {
    const point = visited.get(currentKey)!
    path.unshift({ x: point.x, y: point.y })
    currentKey = point.prev
  }

  return path
}

export function canConnect(grid: (Point | null)[][], p1: Point, p2: Point): boolean {
  if (p1.id === p2.id) return false
  if (p1.color !== p2.color) return false
  if (!p1.visible || !p2.visible) return false

  const result = findPath(grid, p1, p2)
  return result.valid
}

export function findConnectablePair(points: Point[]): [Point, Point] | null {
  const grid: (Point | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null))
  
  for (const point of points) {
    if (point.visible) {
      grid[point.y][point.x] = point
    }
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p1 = points[i]
      const p2 = points[j]
      if (p1.visible && p2.visible && p1.color === p2.color && canConnect(grid, p1, p2)) {
        return [p1, p2]
      }
    }
  }

  return null
}