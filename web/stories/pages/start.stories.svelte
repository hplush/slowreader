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

<Story name="Custom Server" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.start().showCustomServer()
    }}
    route="start"
    user={false}
  >
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story name="Submitting" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.start().userId.set('4581658299936829')
      pages.start().secret.set('Yo;wV*5Ktm }&OqUv2RB>')
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
      pages.start().secret.set('Yo;wV*5Ktm }&OqUv2RB>')
      pages.start().signError.set(t.get().invalidCredentials)
    }}
    route="start"
    user={false}
  >
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
