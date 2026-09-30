<script context="module" lang="ts">
  import { authMessages, pages } from '@slowreader/core'
  import { testCredentials } from '@slowreader/core/test'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import SignupPage from '../../pages/sign-up.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: SignupPage,
    title: 'Pages/SignUp'
  })
</script>

<Story name="Light" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
    }}
    route="signUp"
    user={false}
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>

<Story
  name="Password Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
      pages.signUp().usePassword.set(true)
      pages.signUp().error.set(authMessages.get().userIdTaken)
    }}
    route="signUp"
    user={false}
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>

<Story name="No Passkeys" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
    }}
    passkeys={false}
    route="signUp"
    user={false}
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>

<Story name="Passkey Step" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
      pages.signUp().step.set({ provider: null, type: 'passkey' })
    }}
    route="signUp"
    user={false}
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>

<Story name="Password Step" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
      pages.signUp().step.set({ type: 'password' })
    }}
    route="signUp"
    user={false}
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>

<Story
  name="Passkey Without PRF"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
      pages.signUp().error.set(authMessages.get().passkeyNoPrf)
    }}
    route="signUp"
    user={false}
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>
