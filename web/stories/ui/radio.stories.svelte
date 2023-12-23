<script context="module" lang="ts">
  import UiRadioField from '../../ui/radio-field.svelte'

  export const meta = {
    component: UiRadioField,
    title: 'UI/RadioField'
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
      <UiRadioField
        current={$store}
        label="Normal radio"
        values={[
          ['1', 'First option'],
          ['2', 'Second option'],
          ['3', 'Third option']
        ]}
        on:change={e => {
          store.set(e.detail)
        }}
      />
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
  <Section hover="label:first-of-type" width={500}>
    <UiCard>
      <UiRadioField
        current="1"
        label="Hover"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
  <Section active="label:first-of-type" width={500}>
    <UiCard>
      <UiRadioField
        current="1"
        label="Active"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
  <Section focus="label:first-of-type" width={500}>
    <UiCard>
      <UiRadioField
        current="1"
        label="Focus"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
  <Section active="label:last-of-type" width={500}>
    <UiCard>
      <UiParagraph>Before</UiParagraph>
      <UiRadioField
        current="1"
        label="Hover"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
  <Section width={500}>
    <UiCard>
      <UiParagraph>Before</UiParagraph>
      <UiRadioField
        current="1"
        hideLabel
        label="Label"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <UiCard>
      <UiRadioField
        current={$store}
        label="Normal radio"
        values={[
          ['1', 'First option'],
          ['2', 'Second option'],
          ['3', 'Third option']
        ]}
        on:change={e => {
          store.set(e.detail)
        }}
      />
      <UiParagraph>After</UiParagraph>
    </UiCard>
  </Section>
  <Section hover="label:first-of-type" width={500}>
    <UiCard>
      <UiRadioField
        current="1"
        label="Hover"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
  <Section active="label:first-of-type" width={500}>
    <UiCard>
      <UiRadioField
        current="1"
        label="Active"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
  <Section focus="label:first-of-type" width={500}>
    <UiCard>
      <UiRadioField
        current="1"
        label="Focus"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </UiCard>
  </Section>
</Story>
