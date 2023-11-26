<script context="module" lang="ts">
  import UiCard from '../../ui/card.svelte'

  export const meta = {
    component: UiCard,
    title: 'UI/Card'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Section from '../section.svelte'
</script>

<Story name="Base">
  <Section>
    <UiCard>Test</UiCard>
  </Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'lightSlow' } }}>
  <Section>
    <UiCard>Test</UiCard>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section>
    <UiCard>Test</UiCard>
  </Section>
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'darkSlow' } }}>
  <Section>
    <UiCard>Test</UiCard>
  </Section>
</Story>
