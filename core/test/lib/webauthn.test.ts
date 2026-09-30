import { deepEqual } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  filterAssertion,
  filterProof,
  filterRegistration
} from '../../lib/webauthn.ts'

describe('webauthn', () => {
  test('removes PRF output and unknown fields from browser responses', () => {
    let browser = {
      authenticatorAttachment: null,
      clientExtensionResults: { prf: { results: { first: 'secret' } } },
      extra: 'field',
      id: 'id',
      rawId: 'id',
      response: {
        attestationObject: 'attestation',
        authenticatorData: 'data',
        clientDataJSON: 'client',
        extra: 'field',
        signature: 'signature',
        transports: ['internal']
      },
      type: 'public-key'
    }
    deepEqual(filterRegistration(browser), {
      clientExtensionResults: {},
      id: 'id',
      rawId: 'id',
      response: {
        attestationObject: 'attestation',
        authenticatorData: 'data',
        clientDataJSON: 'client',
        transports: ['internal']
      },
      type: 'public-key'
    })
    deepEqual(
      filterAssertion({ ...browser, authenticatorAttachment: 'platform' }),
      {
        authenticatorAttachment: 'platform',
        clientExtensionResults: {},
        id: 'id',
        rawId: 'id',
        response: {
          authenticatorData: 'data',
          clientDataJSON: 'client',
          signature: 'signature'
        },
        type: 'public-key'
      }
    )
    deepEqual(
      filterProof({ authKey: 'key', extra: 'field' } as { authKey: string }),
      { authKey: 'key' }
    )
  })
})
