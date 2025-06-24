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
  import { mdiPlus } from '@mdi/js'

  function onclick(): void {}
</script>

<Story name="Light" asChild>
  <Section>
    <Button icon={mdiPlus} {onclick}>Base</Button>
  </Section>
  <Section>
    <Button href="#">Link</Button>
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section>
    <Button {onclick}>Base</Button>
  </Section>
</Story>
