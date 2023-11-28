<script context="module" lang="ts">
  import UiButton from '../../ui/button.svelte'

  export const meta = {
    component: UiButton,
    title: 'UI/Button'
  }
</script>

<script lang="ts">
  import { mdiPlusCircleOutline } from '@mdi/js'
  import { Story } from '@storybook/addon-svelte-csf'

  import UiCard from '../../ui/card.svelte'
  import Section from '../section.svelte'
</script>

<Story name="Base">
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
  <Section><UiButton icon={mdiPlusCircleOutline}>Icon</UiButton></Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'lightSlow' } }}>
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'darkSlow' } }}>
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
</Story>
