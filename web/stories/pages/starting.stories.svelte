<script context="module" lang="ts">
  import StartingPage from '../../pages/starting.svelte'

  export const meta = {
    component: StartingPage,
    title: 'Pages/Starting'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <StartingPage />
</Story>
