<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import DownloadPage from '../../pages/download.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: DownloadPage,
    title: 'Pages/Download'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="download">
    <DownloadPage />
  </Scene>
</Story>
