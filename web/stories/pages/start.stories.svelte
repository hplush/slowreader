<script context="module" lang="ts">
  import StartPage from '../../pages/start.svelte'

  export const meta = {
    component: StartPage,
    title: 'Pages/Start'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <StartPage />
</Story>
