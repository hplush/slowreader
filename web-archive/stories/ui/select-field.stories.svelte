<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import SelectField from '../../ui/select-field.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: SelectField,
    title: 'UI/SelectField'
  })
</script>

<script lang="ts">
  let selectValue = $state<'1' | '2' | '3'>('2')
</script>

<Story name="Base">
  <Section width={200}>
    <SelectField
      current={selectValue}
      label="Label"
      onchange={value => {
        selectValue = value
      }}
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section hover width={200}>
    <SelectField
      current="2"
      label="Label"
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section focus width={200}>
    <SelectField
      current="2"
      label="Label"
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section active width={200}>
    <SelectField
      current="2"
      label="Label"
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section width={200}>
    <SelectField
      current="2"
      label="Label"
      values={[
        ['1', 'First'],
        ['2', 'A very very very long option value'],
        ['3', 'Third']
      ]}
    />
  </Section>
  <Section hover width={200}>
    <SelectField
      current="2"
      hideLabel
      label="Label"
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
    />
  </Section>
</Story>
