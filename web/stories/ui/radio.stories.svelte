<script lang="ts" module>
  import {
    mdiNumeric1BoxOutline,
    mdiNumeric2BoxOutline,
    mdiNumeric3BoxOutline
  } from '@mdi/js'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import Radio from '../../ui/radio.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Radio,
    title: 'UI/Radio'
  })
</script>

<script lang="ts">
  type Value = 'one' | 'three' | 'two'
  let store1 = atom<Value>('one')
  let store2 = atom<Value>('two')
  let store3 = atom<Value>('three')
  let values = [
    ['one', '1', mdiNumeric1BoxOutline],
    ['two', '2', mdiNumeric2BoxOutline],
    ['three', 'Three', mdiNumeric3BoxOutline]
  ] as [Value, string, string][]
</script>

<Story name="Light" asChild>
  <Section stack width={300}>
    <Radio label="First" store={store1} {values} />
    <Radio label="Middle" store={store2} {values} />
    <Radio label="Last" store={store3} {values} />
    <Radio
      label="Long"
      store={store3}
      values={[
        ['one', 'Very first element', mdiNumeric1BoxOutline],
        ['two', '2', mdiNumeric2BoxOutline],
        ['three', 'Three', mdiNumeric3BoxOutline]
      ]}
    />
  </Section>
  <Section
    active="fieldset:nth-child(2) label:first-of-type"
    focus="fieldset:nth-child(3) label:first-of-type input"
    hover="fieldset:first-child label:first-of-type"
    stack
    width={300}
  >
    <Radio label="Hover" store={store2} {values} />
    <Radio label="Pressed" store={store2} {values} />
    <Radio label="Focus" store={store1} {values} />
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section
    active="fieldset:nth-child(3) label:first-of-type"
    focus="fieldset:nth-child(4) label:first-of-type input"
    hover="fieldset:nth-child(2) label:first-of-type"
    stack
    width={300}
  >
    <Radio label="Base" store={store1} {values} />
    <Radio label="Hover" store={store2} {values} />
    <Radio label="Pressed" store={store2} {values} />
    <Radio label="Focus" store={store1} {values} />
  </Section>
</Story>
