<script context="module" lang="ts">
  import UiButton from '../../ui/button.svelte'

  export const meta = {
    component: UiButton,
    title: 'UI/Button'
  }
</script>

<script lang="ts">
  import { Story, Template } from '@storybook/addon-svelte-csf'
</script>

<Template let:args>
  <UiButton {...args}>Test</UiButton>
</Template>

<Story name="Base" args={{}} />

<Story name="Hover" args={{}} parameters={{ pseudo: { hover: true } }} />
