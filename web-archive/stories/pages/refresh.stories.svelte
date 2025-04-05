<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import RefreshPage from '../../pages/refresh.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: RefreshPage,
    title: 'Pages/Refresh'
  })
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
