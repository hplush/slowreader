<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import RadioList from '../../ui/radio-list.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: RadioList,
    title: 'UI/Radio List'
  })

  type State = 'active' | 'disabled' | 'focus' | 'hover' | 'normal' | 'selected'

  const STATES = [
    {
      description: 'Short description.',
      name: 'Selected',
      value: 'selected' as State
    },
    {
      description:
        'Slow Reader combines feeds from social networks and RSS and helps ' +
        'read more meaningful and deep content.',
      name: 'Normal',
      value: 'normal' as State
    },
    {
      description: 'Short description.',
      name: 'Hover',
      value: 'hover' as State
    },
    {
      description: 'Short description.',
      name: 'Active',
      value: 'active' as State
    },
    {
      description: 'Short description.',
      name: 'Focus',
      value: 'focus' as State
    }
  ]

  type Option = 'first' | 'second' | 'third'

  const OPTIONS = [
    {
      description:
        'Slow Reader combines feeds from social networks and RSS and helps ' +
        'read more meaningful and deep content.',
      name: 'The first one',
      value: 'first' as Option
    },
    {
      description: 'Short description.',
      name: 'The second one',
      value: 'second' as Option
    },
    {
      description: 'This option is not available on this device.',
      disabled: true,
      name: 'The third one',
      value: 'third' as Option
    }
  ]
</script>

<script lang="ts">
  let checked: Option = $state('first')
</script>

{#snippet variants()}
  <Section stack width={320}>
    <RadioList
      label="Switching"
      onchange={value => {
        checked = value
      }}
      value={checked}
      values={OPTIONS}
    />
  </Section>
  <Section
    active="li:nth-child(4) label"
    focus="li:nth-child(5) label"
    hover="li:nth-child(3) label"
    stack
    width={320}
  >
    <RadioList
      label="States"
      onchange={() => {}}
      value={'selected' as State}
      values={STATES}
    />
  </Section>
{/snippet}

<Story name="Light" asChild>
  {@render variants()}
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  {@render variants()}
</Story>
