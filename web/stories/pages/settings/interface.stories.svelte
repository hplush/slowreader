<script context="module" lang="ts">
  import SettingsInterface from '../../../pages/settings/interface.svelte'

  export const meta = {
    component: SettingsInterface,
    title: 'Pages/Settings/Interface'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <SettingsInterface />
</Story>
