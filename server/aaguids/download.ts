import { downloadProvidersIfMissed } from './utils.ts'

await downloadProvidersIfMissed(process.argv[2])
