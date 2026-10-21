// The visitor's answer to SpotifyPrompt, remembered so it's asked once.
const KEY = 'spotify-choice'

export function hasSpotifyChoice() {
  try { return localStorage.getItem(KEY) !== null } catch { return true }
}

export function rememberSpotifyChoice(choice: 'login' | 'skip') {
  try { localStorage.setItem(KEY, choice) } catch { /* ignore */ }
}
