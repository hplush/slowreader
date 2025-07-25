<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Output from '../../ui/output.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Output,
    title: 'UI/Output'
  })
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  let outputRef: Output
  onMount(() => {
    let intervalId = setInterval(() => {
      outputRef.triggerCopy()
    }, 3000)

    return () => clearInterval(intervalId)
  })
</script>

<Story name="Light" asChild>
  <Section width={200}>
    <Output label="Base" value="test" />
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={200}>
    <Output label="Base" value="test" />
  </Section>
</Story>

<Story name="Auto Click" asChild>
  <Section width={200}>
    <Output bind:this={outputRef} label="Base" value="test" />
  </Section>
</Story>
