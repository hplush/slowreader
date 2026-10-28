<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FatalPage from '../../pages/fatal.svelte'
  import { clientUpdate } from '../../stores/client-update.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: FatalPage,
    title: 'Pages/Fatal'
  })
</script>

<script lang="ts">
  import { fatal, pages } from '@slowreader/core'
</script>

<Story name="Not Found" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="fatal" user={false}>
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story name="Outdated" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      clientUpdate.set('available')
    }}
    route={{ params: { reason: 'outdated' }, route: 'fatal' }}
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story
  name="Outdated Checking"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      clientUpdate.set('checking')
    }}
    route={{ params: { reason: 'outdated' }, route: 'fatal' }}
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story
  name="Broken Database"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      clientUpdate.set('available')
      fatal.set({
        error: 'Database disk image is malformed',
        type: 'brokenDatabase'
      })
    }}
    route="fatal"
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story name="Crash" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      clientUpdate.set('latest')
      fatal.set({
        error:
          'Error: No Slow Reader database\n' +
          '    at getClient (core/client.ts:48:11)\n' +
          '    at feedsPage (core/pages/feeds.ts:12:17)\n' +
          '    at openPage (core/current-page.ts:22:9)',
        type: 'crash'
      })
    }}
    route="fatal"
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story name="No Storage" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      clientUpdate.set(undefined)
    }}
    route={{ params: { reason: 'noDb' }, route: 'fatal' }}
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story name="Second Tab" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    route={{ params: { reason: 'secondTab' }, route: 'fatal' }}
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story name="Rejected" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      fatal.set({
        error: 'denied 1757000000000 10000000000000000:F7AhLe:1',
        type: 'rejected'
      })
    }}
    route="fatal"
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      clientUpdate.set('checking')
      fatal.set({
        error: 'Database disk image is malformed',
        type: 'brokenDatabase'
      })
    }}
    route="fatal"
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>
