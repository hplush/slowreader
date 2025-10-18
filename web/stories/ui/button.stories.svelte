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

  import Scene from '../scene.svelte'

  function onclick(): void {}
</script>

<Story name="Light" asChild>
  <Scene>
    <Section
      active="button:nth-child(3)"
      focus="button:nth-child(4)"
      hover="button:nth-child(2)"
    >
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
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
    <Section width={300}>
      <Button {icon} {onclick} size="wide">Wide</Button>
    </Section>
    <Section width={300}>
      <Button {icon} {onclick} size="big" variant="main">Big</Button>
    </Section>
    <Section>
      <Button {icon} {onclick} size="icon">Icon</Button>
    </Section>
    <Section>
      <Button {icon} {onclick} size="pill" variant="secondary">
        Add if you really want
      </Button>
    </Section>
    <Section width={300}>
      <Button {icon} {onclick}>
        The really long text in the short container
        withverybigwordwhichcanbreakthecontainer
      </Button>
    </Section>
    <Section>
      <Button {icon} loader="Submitting" {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
    </Section>
  </Scene>
</Story>

<Story name="Light Slow" asChild>
  <Scene route="notFound">
    <Section
      active="button:nth-child(3)"
      focus="button:nth-child(4)"
      hover="button:nth-child(2)"
    >
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
    </Section>
    <Section>
      <Button {icon} loader="Submitting" {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
    </Section>
  </Scene>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene>
    <Section
      active="button:nth-child(3)"
      focus="button:nth-child(4)"
      hover="button:nth-child(2)"
    >
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
    </Section>
    <Section>
      <Button {icon} loader="Submitting" {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
    </Section>
  </Scene>
</Story>

<Story
  name="Dark Slow"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Scene route="notFound">
    <Section
      active="button:nth-child(3)"
      focus="button:nth-child(4)"
      hover="button:nth-child(2)"
    >
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
      <Button {icon} {onclick} variant="plain-secondary">
        Plain Secondary
      </Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
      <Button {icon} {onclick} variant="plain-dangerous">
        Plain Dangerous
      </Button>
    </Section>
    <Section>
      <Button {icon} loader="Submitting" {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
    </Section>
  </Scene>
</Story>
