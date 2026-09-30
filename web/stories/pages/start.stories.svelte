<script context="module" lang="ts">
  import { pages, commonMessages as t } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import StartPage from '../../pages/start.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: StartPage,
    title: 'Pages/Start'
  })
</script>

<Story name="Light" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="start" user={false}>
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story name="Submitting" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.start().signingIn.set(true)
    }}
    route="start"
    user={false}
  >
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story name="Server Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.start().userId.set('4581658299936829')
      pages
        .start()
        .password.set(
          'PDn2M6eYaGPcG5eBC231rdJ8xJB34EryNVzP1xSjadrHbViwxHNeJ4CSEa5T18YhFT'
        )
      pages.start().signError.set(t.get().invalidCredentials)
    }}
    route="start"
    user={false}
  >
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story name="Passkey Without PRF" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.start().usePassword.set(true)
      pages.start().signError.set(t.get().passkeyNoPrf)
    }}
    route="start"
    user={false}
  >
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story name="No Passkeys" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene passkeys={false} route="start" user={false}>
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route="start" user={false}>
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="start" user={false}>
    <StartPage page={pages.start()} />
  </Scene>
</Story>
