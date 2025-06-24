<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Button from '../../ui/button.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Button,
    title: 'UI/Button'
  })
</script>

<script lang="ts">
  let clicks = $state(0)

  function onclick(): void {}

  function increment(): void {
    clicks += 1
  }
</script>

{#snippet template({ children }: Args)}
  111: {children}
{/snippet}

<Story name="Light" asChild>
  <Section>
    <Button onclick={increment}>Base</Button>
    <div class="counter">{clicks}</div>
  </Section>
  <Section>
    <Button href="#">Link</Button>
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section>
    <Button onclick={increment}>Base</Button>
    <div class="counter">{clicks}</div>
  </Section>
</Story>

<style>
  .counter {
    position: absolute;
    position: relative;
    top: 2px;
    box-sizing: border-box;
    display: inline-block;
    display: inline-flex;
    padding-inline-start: 10px;
  }
</style>
