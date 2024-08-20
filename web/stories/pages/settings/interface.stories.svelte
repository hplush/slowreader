<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import SettingsInterface from '../../../pages/settings/interface.svelte'

  let { Story } = defineMeta({
    component: SettingsInterface,
    title: 'Pages/Settings/Interface'
  })
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <SettingsInterface />
</Story>
