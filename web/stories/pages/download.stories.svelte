<script context="module" lang="ts">
  import DownloadPage from '../../pages/download.svelte'

  export const meta = {
    component: DownloadPage,
    title: 'Pages/Download'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <DownloadPage />
</Story>
