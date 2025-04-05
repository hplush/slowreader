<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Card from '../../ui/card.svelte'
  import Paragraph from '../../ui/paragraph.svelte'
  import RadioField from '../../ui/radio-field.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: RadioField,
    title: 'UI/RadioField'
  })
</script>

<script lang="ts">
  import { atom } from 'nanostores'

  let store = atom<string>('1')
</script>

<Story name="Base">
  <Section width={500}>
    <Card>
      <RadioField
        current={$store}
        label="Normal radio"
        onchange={value => {
          store.set(value)
        }}
        values={[
          ['1', 'First option'],
          ['2', 'Second option'],
          ['3', 'Third option']
        ]}
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
  <Section focus="label:first-of-type input" width={500}>
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
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <Card>
      <RadioField
        current={$store}
        label="Normal radio"
        onchange={value => {
          store.set(value)
        }}
        values={[
          ['1', 'First option'],
          ['2', 'Second option'],
          ['3', 'Third option']
        ]}
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
  <Section focus="label:first-of-type input" width={500}>
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
