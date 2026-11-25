<script lang="ts" module>
  import {
    mdiNumeric1BoxOutline,
    mdiNumeric2BoxOutline,
    mdiNumeric3BoxOutline,
    mdiNumeric4BoxOutline
  } from '@mdi/js'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Tabs from '../../ui/tabs.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Tabs,
    title: 'UI/Tabs'
  })
</script>

<script lang="ts">
  type Value = 'four' | 'one' | 'three' | 'two'
  let current: Value = $state('one')
  let values = [
    ['one', 'First', mdiNumeric1BoxOutline],
    ['two', 'Second', mdiNumeric2BoxOutline],
    ['three', 'Third', mdiNumeric3BoxOutline]
  ] as [Value, string, string][]
</script>

{#snippet popup(
  label: string,
  value: Value,
  list: [Value, string, string?][] = values,
  onchange: (value: Value) => void = () => {}
)}
  <div
    style="

--popup-padding: var(--page-padding);

 padding: var(--page-padding);"
  >
    <Tabs {label} {onchange} {value} values={list}>{label}</Tabs>
  </div>
{/snippet}

{#snippet states()}
  {@render popup('Base', current, values, value => {
    current = value
  })}
  {@render popup('Middle', 'two')}
  {@render popup('Hover', 'one')}
  {@render popup('Pressed', 'one')}
  {@render popup('Focus', 'one')}
  {@render popup('Focus on selected', 'one')}
{/snippet}

<Story name="Light" asChild>
  <Section
    active="[aria-label='Pressed'] button:nth-child(2)"
    focus="[aria-label='Focus'] button:nth-child(2), [aria-label='Focus on selected'] button:first-child"
    hover="[aria-label='Hover'] button:nth-child(2)"
    main
    width={480}
  >
    {@render states()}
    {@render popup('Iconless', 'three', [
      ['one', 'First'],
      ['two', 'Second'],
      ['three', 'Third']
    ])}
    {@render popup('Long', 'one', [
      ['one', 'Very first element', mdiNumeric1BoxOutline],
      ['two', 'Second long name', mdiNumeric2BoxOutline],
      ['three', 'Third long name', mdiNumeric3BoxOutline]
    ])}
    <div style="width: 20rem;">
      {@render popup('Narrow', 'one', [
        ['one', 'Recent', mdiNumeric1BoxOutline],
        ['two', 'Liked', mdiNumeric2BoxOutline],
        ['three', 'Opened', mdiNumeric3BoxOutline],
        ['four', 'Disliked', mdiNumeric4BoxOutline]
      ])}
    </div>
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section
    active="[aria-label='Pressed'] button:nth-child(2)"
    focus="[aria-label='Focus'] button:nth-child(2), [aria-label='Focus on selected'] button:first-child"
    hover="[aria-label='Hover'] button:nth-child(2)"
    main
    width={480}
  >
    {@render states()}
  </Section>
</Story>
