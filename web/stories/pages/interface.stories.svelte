<script context="module" lang="ts">
  import InterfacePage from '../../pages/interface.svelte'

  export const meta = {
    component: InterfacePage,
    title: 'Pages/Interface'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <InterfacePage />
</Story>
