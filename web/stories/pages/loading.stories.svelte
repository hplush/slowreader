<script context="module" lang="ts">
  import LoadingPage from '../../pages/loading.svelte'

  export const meta = {
    component: LoadingPage,
    title: 'Pages/Loading'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base" parameters={{ layout: 'fullscreen' }}>
  <LoadingPage />
</Story>
