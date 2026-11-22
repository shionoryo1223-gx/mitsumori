// The second click of a double-click has MouseEvent.detail >= 2. Keyboard activation has detail 0.
// Not time-based, so it does not depend on Date or timers.
export function onSingleClick(action: () => void): (event: MouseEvent) => void {
  return (event) => {
    if (event.detail > 1) return
    action()
  }
}
