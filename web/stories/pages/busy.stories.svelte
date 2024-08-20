<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Busy from '../../pages/busy.svelte'

  let { Story } = defineMeta({
    component: Busy,
    title: 'Pages/Busy'
  })
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <Busy />
</Story>
