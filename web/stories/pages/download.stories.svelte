<script context="module" lang="ts">
  import DownloadPage from '../../pages/download.svelte'

  export const meta = {
    component: DownloadPage,
    title: 'Pages/Download'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../scene.svelte'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <DownloadPage />
  </Scene>
</Story>

<Story name="No Network Type" parameters={{ layout: 'fullscreen' }}>
  <Scene networkType={{ saveData: undefined, type: undefined }}>
    <DownloadPage />
  </Scene>
</Story>
