<script context="module" lang="ts">
  import Loader from '../../ui/loader.svelte'

  export const meta = {
    component: Loader,
    title: 'Loader'
  }
</script>

<script lang="ts">
  import { Story, Template } from '@storybook/addon-svelte-csf'
</script>

<Template let:args>
  <Loader {...args} />
</Template>

<Story name="Base" args={{}} />
