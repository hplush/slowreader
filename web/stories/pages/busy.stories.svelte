<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import BusyPage from '../../pages/busy.svelte'

  let { Story } = defineMeta({
    component: BusyPage,
    title: 'Pages/Busy'
  })
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }} />
