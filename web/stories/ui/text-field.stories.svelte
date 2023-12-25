<script context="module" lang="ts">
  import UiTextField from '../../ui/text-field.svelte'

  export const meta = {
    component: UiTextField,
    title: 'UI/TextField'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import UiCard from '../../ui/card.svelte'
  import UiParagraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'

  let value = 'Value'
</script>

<Story name="Base">
  <Section width={500}>
    <UiCard>
      <UiTextField label="Base" required bind:value />
    </UiCard>
    <UiParagraph>{value}</UiParagraph>
  </Section>
  <Section width={500}>
    <UiCard>
      <UiTextField hideLabel label="Label" placeholder="Empty" value="" />
      <UiTextField hideLabel label="Label" placeholder="Another" value="" />
    </UiCard>
  </Section>
  <Section width={500}>
    <UiCard>
      <UiTextField error="The value is wrong" label="Wrong" value="Wrong" />
    </UiCard>
  </Section>
  <Section focus="input:first-of-type" width={500}>
    <UiCard>
      <UiTextField enterHint label="Focus" />
      <UiTextField label="Required" required value="" />
      <UiTextField enterHint label="Wrong URL" type="url" value="No a link" />
    </UiCard>
  </Section>
  <Section blur width={500}>
    <UiCard>
      <UiTextField label="Required and Blur" required value="" />
    </UiCard>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <UiCard>
      <UiTextField label="Empty" bind:value />
      <UiParagraph>{value}</UiParagraph>
    </UiCard>
  </Section>
  <Section width={500}>
    <UiCard>
      <UiTextField label="Label" value="Text" />
    </UiCard>
  </Section>
  <Section width={500}>
    <UiCard>
      <UiTextField error="The value is wrong" label="Wrong" value="Wrong" />
    </UiCard>
  </Section>
  <Section focus width={500}>
    <UiCard>
      <UiTextField enterHint label="Focus" />
    </UiCard>
  </Section></Story
>
