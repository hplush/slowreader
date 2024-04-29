<script context="module" lang="ts">
  import Busy from '../../pages/busy.svelte'

  export const meta = {
    component: Busy,
    title: 'Pages/Busy'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <Busy />
</Story>
