<script context="module" lang="ts">
  import RadioField from '../../ui/radio-field.svelte'

  export const meta = {
    component: RadioField,
    title: 'UI/RadioField'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import Card from '../../ui/card.svelte'
  import Paragraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'

  let store = atom<string>('1')
</script>

<Story name="Base">
  <Section width={500}>
    <Card>
      <RadioField
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
      <Paragraph>After</Paragraph>
    </Card>
  </Section>
  <Section hover="label:first-of-type" width={500}>
    <Card>
      <RadioField
        current="1"
        label="Hover"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
  <Section active="label:first-of-type" width={500}>
    <Card>
      <RadioField
        current="1"
        label="Active"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
  <Section focus="label:first-of-type" width={500}>
    <Card>
      <RadioField
        current="1"
        label="Focus"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
  <Section active="label:last-of-type" width={500}>
    <Card>
      <Paragraph>Before</Paragraph>
      <RadioField
        current="1"
        label="Hover"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>Before</Paragraph>
      <RadioField
        current="1"
        hideLabel
        label="Label"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <Card>
      <RadioField
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
      <Paragraph>After</Paragraph>
    </Card>
  </Section>
  <Section hover="label:first-of-type" width={500}>
    <Card>
      <RadioField
        current="1"
        label="Hover"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
  <Section active="label:first-of-type" width={500}>
    <Card>
      <RadioField
        current="1"
        label="Active"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
  <Section focus="label:first-of-type" width={500}>
    <Card>
      <RadioField
        current="1"
        label="Focus"
        values={[
          ['1', 'First option'],
          ['2', 'Second option']
        ]}
      />
    </Card>
  </Section>
</Story>
