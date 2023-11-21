<script context="module" lang="ts">
  import UiLoader from '../../ui/loader.svelte'

  export const meta = {
    component: UiLoader,
    title: 'UI/Loader'
  }
</script>

<script lang="ts">
  import { Story, Template } from '@storybook/addon-svelte-csf'
</script>

<Template let:args>
  <UiLoader {...args} />
</Template>

<Story name="Base" args={{}} />
