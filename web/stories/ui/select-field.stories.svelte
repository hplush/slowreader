<script context="module" lang="ts">
  import UiSelectField from '../../ui/select-field.svelte'

  export const meta = {
    component: UiSelectField,
    title: 'UI/SelectField'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Section from '../section.svelte'

  let selectValue: '1' | '2' | '3' = '2'
</script>

<Story name="Base">
  <Section width={200}>
    <UiSelectField
      current={selectValue}
      label="Label"
      values={[
        ['1', 'First'],
        ['2', 'Second'],
        ['3', 'Third']
      ]}
      on:change={e => {
        selectValue = e.detail
      }}
    />
  </Section>
  <Section hover width={200}>
    <UiSelectField
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
    <UiSelectField
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
    <UiSelectField
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
    <UiSelectField
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
    <UiSelectField
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
