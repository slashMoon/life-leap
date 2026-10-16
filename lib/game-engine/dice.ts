/** 服务端掷骰（防作弊，1-6） */
export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function movePosition(
  currentIndex: number,
  steps: number,
  trackSize: number
): number {
  return (currentIndex + steps) % trackSize;
}
