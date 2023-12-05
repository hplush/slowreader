<script context="module" lang="ts">
  import UiRadio from '../../ui/radio.svelte'

  export const meta = {
    component: UiRadio,
    title: 'UI/Radio'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import UiCard from '../../ui/card.svelte'
  import UiParagraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'

  let store = atom<string>('1')
</script>

<Story name="Base">
  <Section width={500}>
    <UiCard>
      <UiRadio
        {store}
        title="Normal radio"
        values={[
          ['1', 'First option'],
          ['2', 'Second option'],
          ['3', 'Third option']
        ]}
      />
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
  <Section hover="label:first-of-type" width={500}>
    <UiCard>
      <UiRadio
        {store}
        title="Hover"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
  <Section active="label:first-of-type" width={500}>
    <UiCard>
      <UiRadio
        {store}
        title="Active"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
  <Section focus="label:first-of-type" width={500}>
    <UiCard>
      <UiRadio
        {store}
        title="Focus"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <UiCard>
      <UiRadio
        {store}
        title="Normal radio"
        values={[
          ['1', 'First option'],
          ['2', 'Second option'],
          ['3', 'Third option']
        ]}
      />
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
</Story>
