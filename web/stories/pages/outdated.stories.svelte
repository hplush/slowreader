<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import OutdatedPage from '../../pages/outdated.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: OutdatedPage,
    title: 'Pages/Outdated'
  })
</script>

<Story name="Light" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="outdated" user={false}>
    <OutdatedPage />
  </Scene>
</Story>
