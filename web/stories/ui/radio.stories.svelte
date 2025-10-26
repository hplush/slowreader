<script lang="ts" module>
  import {
    mdiNumeric1BoxOutline,
    mdiNumeric2BoxOutline,
    mdiNumeric3BoxOutline
  } from '@mdi/js'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Radio from '../../ui/radio.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Radio,
    title: 'UI/Radio'
  })
</script>

<script lang="ts">
  type Value = 'one' | 'three' | 'two'
  let store1: Value = $state('one')
  let store2: Value = $state('two')
  let store3: Value = $state('three')
  let values = [
    ['one', '1', mdiNumeric1BoxOutline],
    ['two', '2', mdiNumeric2BoxOutline],
    ['three', 'Three', mdiNumeric3BoxOutline]
  ] as [Value, string, string][]
</script>

<Story name="Light" asChild>
  <Section stack width={300}>
    <Radio
      label="First"
      onchange={value => {
        store1 = value
      }}
      value={store1}
      {values}
    />
    <Radio
      label="Middle"
      onchange={value => {
        store2 = value
      }}
      value={store2}
      {values}
    />
    <Radio
      label="Last"
      onchange={value => {
        store3 = value
      }}
      value={store3}
      {values}
    />
    <Radio
      label="Wide"
      onchange={value => {
        store3 = value
      }}
      value={store3}
      {values}
      wide
    />
    <Radio
      label="Long"
      onchange={value => {
        store3 = value
      }}
      value={store3}
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
    <Radio
      label="Hover"
      onchange={value => {
        store2 = value
      }}
      value={store2}
      {values}
    />
    <Radio
      label="Pressed"
      onchange={value => {
        store2 = value
      }}
      value={store2}
      {values}
    />
    <Radio
      label="Focus"
      onchange={value => {
        store1 = value
      }}
      value={store1}
      {values}
    />
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
    <Radio
      label="Base"
      onchange={value => {
        store1 = value
      }}
      value={store1}
      {values}
    />
    <Radio
      label="Hover"
      onchange={value => {
        store2 = value
      }}
      value={store2}
      {values}
    />
    <Radio
      label="Pressed"
      onchange={value => {
        store2 = value
      }}
      value={store2}
      {values}
    />
    <Radio
      label="Focus"
      onchange={value => {
        store1 = value
      }}
      value={store1}
      {values}
    />
  </Section>
</Story>
