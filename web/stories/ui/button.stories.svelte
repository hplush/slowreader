<script context="module" lang="ts">
  import UiButton from '../../ui/button.svelte'

  export const meta = {
    component: UiButton,
    title: 'UI/Button'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
</script>

<Story name="Base">
  <UiButton>Test</UiButton>
</Story>

<Story name="Hover" parameters={{ pseudo: { hover: true } }}>
  <UiButton>Test</UiButton>
</Story>
