<script context="module" lang="ts">
  import LoadPage from '../../pages/load.svelte'

  export const meta = {
    component: LoadPage,
    title: 'Pages/Load'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <LoadPage />
</Story>
