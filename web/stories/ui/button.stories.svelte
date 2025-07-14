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
  import { mdiPlusCircleOutline as icon, mdiLink } from '@mdi/js'

  function onclick(): void {}
</script>

<Story name="Light" asChild>
  <Section>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section hover>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section active>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section focus>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section>
    <Button {icon} {onclick} variant="secondary">Secondary</Button>
  </Section>
  <Section hover>
    <Button {icon} {onclick} variant="secondary">Secondary</Button>
  </Section>
  <Section active>
    <Button {icon} {onclick} variant="secondary">Secondary</Button>
  </Section>
  <Section>
    <Button {icon} {onclick} variant="cta">Call to action</Button>
  </Section>
  <Section hover>
    <Button {icon} {onclick} variant="cta">Call to action</Button>
  </Section>
  <Section active>
    <Button {icon} {onclick} variant="cta">Call to action</Button>
  </Section>
  <Section>
    <Button href="#" icon={mdiLink}>Link</Button>
  </Section>
  <Section>
    <Button href="#">Text only</Button>
  </Section>
  <Section>
    <Button disabled {icon} {onclick}>Disabled</Button>
  </Section>
  <Section width={200}>
    <Button {icon} {onclick} size="wide">Wide</Button>
  </Section>
  <Section width={200}>
    <Button {icon} {onclick} size="big">Big</Button>
  </Section>
  <Section>
    <Button {icon} {onclick} size="icon">Icon</Button>
  </Section>
  <Section>
    <Button {icon} {onclick} size="pill" variant="secondary">
      Add if you really want
    </Button>
  </Section>
  <Section width={200}>
    <Button {icon} {onclick}>
      The really long text in the short container
    </Button>
  </Section>
  <Section>
    <Button {icon} loader="Submitting" {onclick}>Main</Button>
    <Button href="/disabled" {icon} loader variant="secondary">Secondary</Button
    >
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section hover>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section active>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section focus>
    <Button {icon} {onclick}>Main</Button>
  </Section>
  <Section>
    <Button {icon} {onclick} variant="secondary">Secondary</Button>
  </Section>
  <Section hover>
    <Button {icon} {onclick} variant="secondary">Secondary</Button>
  </Section>
  <Section active>
    <Button {icon} {onclick} variant="secondary">Secondary</Button>
  </Section>
  <Section>
    <Button {icon} {onclick} variant="cta">Call to action</Button>
  </Section>
  <Section hover>
    <Button {icon} {onclick} variant="cta">Call to action</Button>
  </Section>
  <Section active>
    <Button {icon} {onclick} variant="cta">Call to action</Button>
  </Section>
  <Section>
    <Button {icon} loader="Submitting" {onclick}>Main</Button>
    <Button href="/disabled" {icon} loader variant="secondary">Secondary</Button
    >
  </Section>
</Story>
