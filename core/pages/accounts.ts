import { atom, computed } from 'nanostores'

import {
  addAccount,
  continueAccountSignIn,
  getAccounts,
  openAccountSignInPage,
  returnToAccountSignIn,
  startAccountSignIn
} from '../account.ts'
import { busyDuring } from '../busy.ts'
import { getEnvironment } from '../environment.ts'
import {
  errorToMessage,
  NetworkError,
  showCrash,
  UserFacingError
} from '../errors.ts'
import type { SignInField, SignInStep } from '../loader/common.ts'
import { loaders } from '../loader/index.ts'
import { accountsMessages as t } from '../messages/index.ts'
import { navigate, router } from '../router.ts'
import type { AccountService } from '../schema.ts'
import { createPage } from './common.ts'

export type AccountsStep =
  | { field: SignInField; service: AccountService; type: 'form' }
  | { type: 'list' }

export const accountsPage = createPage('accounts', () => {
  let env = getEnvironment()
  let $error = atom<string | undefined>()
  let $input = atom('')
  let $step = atom<AccountsStep>({ type: 'list' })
  let $submitting = atom(false)

  function toMessage(e: unknown): string {
    if (e instanceof UserFacingError || NetworkError.is(e)) {
      return errorToMessage(e)
    } else {
      env.warn(e)
      return t.get().signInFailed
    }
  }

  /**
   * Data of the loader between form fields.
   */
  let asked: { data: unknown } | undefined

  function open(step: AccountsStep): void {
    asked = undefined
    $error.set(undefined)
    $input.set('')
    $step.set(step)
  }

  async function signedIn(
    service: AccountService,
    step: Extract<SignInStep<unknown>, { type: 'done' }>
  ): Promise<void> {
    let accountId = await addAccount({ ...step.account, service })
    open({ type: 'list' })
    navigate({
      params: {},
      popups: [{ param: accountId, popup: 'account' }],
      route: 'accounts'
    })
  }

  /**
   * Errors after the return from the service are not about user’s input.
   * Mostly they are our bugs, so user should report them.
   */
  async function finishReturn(callback: string): Promise<void> {
    open({ type: 'list' })
    try {
      await busyDuring(t.get().authorizing, async () => {
        let returned = await returnToAccountSignIn(callback)
        if (returned) await next(returned.service, returned.step)
      })
    } catch (e) {
      showCrash(e)
    }
  }

  async function next(
    service: AccountService,
    step: SignInStep<unknown>
  ): Promise<void> {
    if (step.type === 'done') {
      await signedIn(service, step)
    } else if (step.type === 'ask') {
      open({ field: step.field, service, type: 'form' })
      asked = { data: step.data }
    } else {
      // Web never returns here, only native clients with in-app browser
      /* node:coverage ignore next 6 */
      let callback = await openAccountSignInPage(service, step)
      if (callback === undefined) {
        open({ type: 'list' })
      } else {
        await finishReturn(callback)
      }
    }
  }

  // Web returns from the service by opening the page again
  let hash = env.baseRouter.get()?.hash.replace(/^#/, '') ?? ''
  if (/(^|&)(code|error)=/.test(hash)) {
    // Removes the code from the URL and the history
    env.openRoute({ params: {}, popups: [], route: 'accounts' }, true)
    void finishReturn(hash)
  }

  return {
    accounts: getAccounts(),
    add(service: AccountService): void {
      open({
        field: loaders[service].account!.firstField,
        service,
        type: 'form'
      })
    },
    cancel(): void {
      open({ type: 'list' })
    },
    error: $error,
    exit() {},
    input: $input,
    /**
     * ID of the account in the opened popup.
     */
    opened: computed(router, route => route.popups[0]?.param),
    params: {},
    step: $step,
    async submit(): Promise<void> {
      let step = $step.get()
      if (step.type !== 'form') return
      let value = $input.get()
      $error.set(undefined)
      $submitting.set(true)
      try {
        await next(
          step.service,
          asked === undefined
            ? await startAccountSignIn(step.service, value)
            : await continueAccountSignIn(step.service, asked.data, {
                type: 'input',
                value
              })
        )
      } catch (e) {
        $error.set(toMessage(e))
      } finally {
        $submitting.set(false)
      }
    },
    submitting: $submitting
  }
})

export type AccountsPage = ReturnType<typeof accountsPage>
