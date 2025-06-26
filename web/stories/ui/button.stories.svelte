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
  import { mdiLink, mdiPlusCircleOutline } from '@mdi/js'

  function onclick(): void {}
</script>

<Story name="Light" asChild>
  <Section>
    <Button icon={mdiPlusCircleOutline} {onclick}>Main</Button>
  </Section>
  <Section hover>
    <Button icon={mdiPlusCircleOutline} {onclick}>Main</Button>
  </Section>
  <Section active>
    <Button icon={mdiPlusCircleOutline} {onclick}>Main</Button>
  </Section>
  <Section focus>
    <Button icon={mdiPlusCircleOutline} {onclick}>Main</Button>
  </Section>
  <Section>
    <Button icon={mdiPlusCircleOutline} {onclick} variant="secondary">
      Secondary
    </Button>
  </Section>
  <Section hover>
    <Button icon={mdiPlusCircleOutline} {onclick} variant="secondary">
      Secondary
    </Button>
  </Section>
  <Section active>
    <Button icon={mdiPlusCircleOutline} {onclick} variant="secondary">
      Secondary
    </Button>
  </Section>
  <Section>
    <Button href="#" icon={mdiLink}>Link</Button>
  </Section>
  <Section>
    <Button href="#">Text only</Button>
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section>
    <Button icon={mdiPlusCircleOutline} {onclick}>Base</Button>
  </Section>
  <Section hover>
    <Button icon={mdiPlusCircleOutline} {onclick}>Base</Button>
  </Section>
  <Section active>
    <Button icon={mdiPlusCircleOutline} {onclick}>Base</Button>
  </Section>
  <Section>
    <Button href="#" icon={mdiLink}>Link</Button>
  </Section>
  <Section>
    <Button href="#">Text only</Button>
  </Section>
</Story>
