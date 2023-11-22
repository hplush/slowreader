<script context="module" lang="ts">
  import RefreshPage from '../../pages/refresh.svelte'

  export const meta = {
    component: RefreshPage,
    title: 'Pages/Refresh'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../scene.svelte'
</script>

<Story name="Base">
  <Scene refreshing={{}}>
    <RefreshPage />
  </Scene>
</Story>

<Story name="Not Refreshing">
  <Scene refreshing={false}>
    <RefreshPage />
  </Scene>
</Story>
