<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import StartPage from '../../pages/start.svelte'

  let { Story } = defineMeta({
    component: StartPage,
    title: 'Pages/Start'
  })
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }} />
