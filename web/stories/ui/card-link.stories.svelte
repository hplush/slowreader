<script context="module" lang="ts">
  import CardLink from '../../ui/card-link.svelte'

  export const meta = {
    component: CardLink,
    title: 'UI/CardLink'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import UiCardLinks from '../../ui/card-links.svelte'
  import UiCard from '../../ui/card.svelte'
  import UiParagraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'
</script>

<Story name="Base">
  <Section width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section hover="li:first-child button" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="Hover" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section active="li:first-child a" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="Pressed" first href="#" />
        <CardLink name="Second" href="#" />
        <CardLink name="Third" href="#" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="First" />
        <CardLink name="Current" current />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section active="li:last-child button" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Pressed" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section focus="li:first-child button" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="Focus" current />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section width={300}>
    <UiCard>
      <UiParagraph>Before</UiParagraph>
      <UiCardLinks>
        <CardLink name="First" first />
        <CardLink name="A super very very long name to test text trimming" />
        <CardLink name="Third" />
      </UiCardLinks>
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section hover="li:first-child button" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="Hover" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section active="li:first-child button" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="Pressed" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section active="li:nth-child(2) button" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="First" first />
        <CardLink name="Pressed" />
        <CardLink name="Third" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section active="li:last-child button" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Pressed" />
      </UiCardLinks>
    </UiCard>
  </Section>

  <Section focus="li:first-child a" width={500}>
    <UiCard>
      <UiCardLinks>
        <CardLink name="Focus" first href="#" />
        <CardLink name="Second" href="#" />
        <CardLink name="Third" href="#" />
      </UiCardLinks>
    </UiCard>
  </Section>
</Story>
