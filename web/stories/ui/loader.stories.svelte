<script context="module" lang="ts">
  import UiLoader from '../../ui/loader.svelte'

  export const meta = {
    component: UiLoader,
    title: 'UI/Loader'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base">
  <UiLoader />
</Story>
