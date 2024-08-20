<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import SettingsDownload from '../../../pages/settings/download.svelte'
  import Scene from '../../scene.svelte'

  let { Story } = defineMeta({
    component: SettingsDownload,
    title: 'Pages/Settings/Download'
  })
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
