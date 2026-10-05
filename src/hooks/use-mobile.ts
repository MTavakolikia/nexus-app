import * as React from "react"

const MOBILE_BREAKPOINT = 768

const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

function getSnapshot() {
  return window.matchMedia(query).matches
}

// The server has no viewport, so the first client render must match the
// server output; the real value arrives on the next commit.
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  const isMobile = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return isMobile
}
