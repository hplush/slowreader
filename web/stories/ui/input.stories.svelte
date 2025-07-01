<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Input from '../../ui/input.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Input,
    title: 'UI/Input'
  })
</script>

<script lang="ts">
  let value = $state('Value')
</script>

<Story name="Light" asChild>
  <Section width={200}>
    <Input label="Base" required bind:value />
    <Input label="Label" placeholder="Empty" value="" />
    <Input error="The value is wrong" label="Wrong" value="Wrong" />
    <Input errorId="error" label="XSS test: <div>" />
    <div id="error">Custom error tag</div>
  </Section>
  <Section focus=".input:first-of-type input" width={200}>
    <Input label="Focus" />
  </Section>
  <Section blur width={200}>
    <Input label="Required and Blur" required value="" />
    <Input label="Wrong URL" type="url" value="No a link" />
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={300}>
    <Input label="Empty" bind:value />
    <Input label="Label" value="Text" />
    <Input error="The value is wrong" label="Wrong" value="Wrong" />
  </Section>
  <Section focus width={300}>
    <Input label="Focus" />
  </Section>
</Story>
