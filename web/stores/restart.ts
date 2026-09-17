import { atom } from 'nanostores'

// Sign out and database reset reload the page, and the tab closing warning
// must not ask the user to confirm the app’s own reload
export const restarting = atom(false)
