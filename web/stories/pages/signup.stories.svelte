<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { testCredentials } from '@slowreader/core/test'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import SignupPage from '../../pages/signup.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: SignupPage,
    title: 'Pages/Signup'
  })
</script>

<Story name="Light" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signup().credentials.set(testCredentials())
    }}
    route="signup"
    user={false}
  >
    <SignupPage page={pages.signup()} />
  </Scene>
</Story>

<Story name="Custom Server" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signup().credentials.set(testCredentials())
      pages.signup().showCustomServer()
    }}
    route="signup"
  >
    <SignupPage page={pages.signup()} />
  </Scene>
</Story>

<Story name="Warning Step" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.signup().credentials.set(testCredentials())
      pages.signup().warningStep.set(true)
    }}
    route="signup"
    user={false}
  >
    <SignupPage page={pages.signup()} />
  </Scene>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      pages.signup().credentials.set(testCredentials())
    }}
    route="signup"
    user={false}
  >
    <SignupPage page={pages.signup()} />
  </Scene>
</Story>
