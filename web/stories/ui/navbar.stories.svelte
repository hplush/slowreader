<script context="module" lang="ts">
  import UiNavbar from '../../ui/navbar.svelte'

  export const meta = {
    component: UiNavbar,
    title: 'UI/Navbar'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../scene.svelte'
</script>

<Story name="Slow">
  <Scene route={{ params: {}, route: 'slowAll' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Fast">
  <Scene route={{ params: {}, route: 'fast' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Add">
  <Scene route={{ params: {}, route: 'add' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Settings">
  <Scene route={{ params: {}, route: 'settings' }}>
    <UiNavbar />
  </Scene>
</Story>

<Story name="Refreshing">
  <Scene refreshing={{}} route={{ params: {}, route: 'fast' }}>
    <UiNavbar />
  </Scene>
</Story>
