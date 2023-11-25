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

<Story name="Light">
  <UiLoader />
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <UiLoader />
</Story>

<Story name="Value">
  <UiLoader value={0.5} />
</Story>
