import type { AuthenticationResponse } from '../validators/webauthn.ts'

export type Proof = { assertion: AuthenticationResponse } | { authKey: string }
