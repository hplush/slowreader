<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Select from '../../ui/select.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Select,
    title: 'UI/Select'
  })
</script>

<script lang="ts">
  type Value = '1' | '2' | '3'

  let value = $state<Value>('2')

  function onchange(v: Value): void {
    value = v
  }
</script>

<Story name="Light" asChild>
  <Section width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section hover width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section focus width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section active width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'A very very very long option value'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section main width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section hover width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section focus width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section active width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'A very very very long option value'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section main width={200}>
    <Select
      label="Label"
      {onchange}
      {value}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
</Story>
