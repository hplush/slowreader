import { atom, computed } from 'nanostores'

import {
  addAccount,
  continueAccountSignIn,
  getAccounts,
  loadAccounts,
  openAccountSignInPage,
  returnToAccountSignIn,
  signInErrorToMessage,
  startAccountSignIn,
  syncFollows
} from '../account.ts'
import { busyDuring } from '../busy.ts'
import { getEnvironment } from '../environment.ts'
import { showCrash } from '../errors.ts'
import type { SignInField, SignInStep } from '../loader/common.ts'
import { loaders } from '../loader/index.ts'
import { POPULAR_MASTODON_SERVERS } from '../loader/mastodon.ts'
import { accountsMessages as t } from '../messages/index.ts'
import { navigate, router } from '../router.ts'
import type { AccountService } from '../schema.ts'
import { createPage, routeParam } from './common.ts'

export type AccountsStep =
  | { field: SignInField; service: AccountService; type: 'form' }
  | { type: 'list' }

export const accountsPage = createPage('accounts', () => {
  let env = getEnvironment()
  let $error = atom<string | undefined>()
  let $input = atom('')
  let $step = atom<AccountsStep>({ type: 'list' })
  let $submitting = atom(false)
  let $service = routeParam('accounts', 'service')

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
    let known = await loadAccounts(service)
    let accountId = await addAccount({ ...step.account, service })
    if (!known.some(i => i.id === accountId)) void syncFollows(service)
    open({ type: 'list' })
    navigate(
      {
        params: {},
        popups: [{ param: accountId, popup: 'account' }],
        route: 'accounts'
      },
      // Back button should not return to the form of the finished sign in
      !!$service.get()
    )
  }

  function showList(): void {
    open({ type: 'list' })
    if ($service.get()) {
      navigate({ params: {}, popups: [], route: 'accounts' }, true)
    }
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
        showList()
      } else {
        await finishReturn(callback)
      }
    }
  }

  async function submit(): Promise<void> {
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
      $error.set(signInErrorToMessage(e))
    } finally {
      $submitting.set(false)
    }
  }

  let unbindService = $service.subscribe(service => {
    if (service) {
      open({
        field: loaders[service].account!.firstField,
        service,
        type: 'form'
      })
    } else {
      open({ type: 'list' })
    }
  })

  // Web returns from the service by opening the page again
  let hash = env.baseRouter.get()?.hash.replace(/^#/, '') ?? ''
  if (/(^|&)(code|error)=/.test(hash)) {
    // Removes the code from the URL and the history
    env.openRoute({ params: {}, popups: [], route: 'accounts' }, true)
    void finishReturn(hash)
  }

  return {
    accounts: getAccounts(),
    cancel(): void {
      showList()
    },
    error: $error,
    exit() {
      unbindService()
    },
    input: $input,
    mastodonServers: POPULAR_MASTODON_SERVERS,
    /**
     * ID of the account in the opened popup.
     */
    opened: computed(router, route => route.popups[0]?.param),
    params: { service: $service },
    signInTo(server: string): Promise<void> {
      $input.set(server)
      return submit()
    },
    step: $step,
    submit,
    submitting: $submitting
  }
})

export type AccountsPage = ReturnType<typeof accountsPage>
