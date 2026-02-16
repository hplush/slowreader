<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
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

<Story name="Custom Server" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
      pages.signUp().showCustomServer()
    }}
    route="signUp"
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>

<Story name="Warning Step" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signUp().credentials.set(testCredentials())
      pages.signUp().warningStep.set(true)
    }}
    route="signUp"
    user={false}
  >
    <SignupPage page={pages.signUp()} />
  </Scene>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
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
