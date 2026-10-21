<script context="module" lang="ts">
  import {
    type AccountPopup,
    type AccountValue,
    GENERAL_CATEGORY,
    testAccount
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import AccountPopupComponent from '../../popups/account.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: AccountPopupComponent,
    title: 'Popups/Account'
  })

  function popup(account: Partial<AccountValue>): AccountPopup {
    return {
      account: atom({
        status: 'ready',
        value: testAccount({ id: 'account', ...account })
      }),
      categories: atom([
        [GENERAL_CATEGORY, 'General'],
        ['social', 'Social'],
        ['new', 'Add category…']
      ]),
      changeCategory() {
        return Promise.resolve()
      },
      destroy() {},
      error: undefined,
      follow: atom(account.follow ?? false),
      loading: atom(false),
      name: 'account',
      notFound: false,
      param: 'account',
      remove() {
        return Promise.resolve()
      },
      uniqueId: 'account'
    }
  }
</script>

<Story name="Mastodon" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="accounts">
    <AccountPopupComponent
      popup={popup({
        follow: true,
        handle: '@sitnik@mastodon.social',
        title: 'Andrey Sitnik'
      })}
    />
  </Scene>
</Story>

<Story
  name="Bluesky Long"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="accounts">
    <AccountPopupComponent
      popup={popup({
        categoryId: 'social',
        handle: '@alexander.hamilton.personal.account.very-long-domain.example',
        service: 'bluesky',
        title: 'Alexander Hamilton with a very long display name on Bluesky'
      })}
    />
  </Scene>
</Story>
