<script context="module" lang="ts">
  import SettingsDownload from '../../../pages/settings/download.svelte'

  export const meta = {
    component: SettingsDownload,
    title: 'Pages/Settings/Download'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../../scene.svelte'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <SettingsDownload />
  </Scene>
</Story>

<Story name="No Network Type" parameters={{ layout: 'fullscreen' }}>
  <Scene networkType={{ saveData: undefined, type: undefined }}>
    <SettingsDownload />
  </Scene>
</Story>
