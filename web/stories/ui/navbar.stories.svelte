<script context="module" lang="ts">
  import UiNavbar from '../../ui/navbar/index.svelte'

  export const meta = {
    component: UiNavbar,
    title: 'UI/Navbar'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../scene.svelte'
  import Section from '../section.svelte'
</script>

<Story name="Slow" parameters={{ layout: 'fullscreen' }}>
  <Scene route={{ params: {}, route: 'slowAll' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Fast" parameters={{ layout: 'fullscreen' }}>
  <Scene route={{ params: {}, route: 'fast' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Add" parameters={{ layout: 'fullscreen' }}>
  <Scene route={{ params: {}, route: 'add' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Settings" parameters={{ layout: 'fullscreen' }}>
  <Scene route={{ params: {}, route: 'settings' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Refreshing" parameters={{ layout: 'fullscreen' }}>
  <Scene refreshing={{}} route={{ params: {}, route: 'fast' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story
  name="Dark Slow"
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route={{ params: {}, route: 'slowAll' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story
  name="Dark Fast"
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route={{ params: {}, route: 'fast' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Focus" parameters={{ layout: 'fullscreen' }}>
  <Scene route={{ params: {}, route: 'slowAll' }}>
    <Section focus=".navbar-switcher_link:first-child">
      <UiNavbar /></Section
    >
  </Scene>
</Story>
