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

<Story name="Light Slow" asChild>
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
      <Button disabled {icon} {onclick} variant="main">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button disabled {icon} {onclick} variant="attention">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" disabled {icon} {onclick}>Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button disabled {icon} {onclick} variant="plain">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section>
      <Button href="#" icon={mdiLink}>Link</Button>
    </Section>
    <Section>
      <Button href="#">Text only</Button>
    </Section>
    <Section width={300}>
      <Button {icon} {onclick} size="wide">Wide</Button>
    </Section>
    <Section width={228}>
      <Button {icon} {onclick} size="wide">Icon hides to keep one line</Button>
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
      <Button {icon} {onclick} size="icon-pill" variant="secondary">
        Icon pill
      </Button>
    </Section>
    <Section width={300}>
      <Button {icon} {onclick}>
        The really long text in the short container
        withverybigwordwhichcanbreakthecontainer
      </Button>
    </Section>
    <Section>
      <Button {icon} loader {onclick} variant="main">Main</Button>
      <Button {icon} loader={0.5} {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
      <Button {icon} loader {onclick} pseudostate="active" variant="secondary">
        Pressed
      </Button>
    </Section>
    <Section>
      <div style="display: flex; width: fit-content;">
        <Button joined="start" {onclick}>Start</Button>
        <Button joined="middle" {onclick}>Middle</Button>
        <Button joined="end" {onclick}>End</Button>
      </div>
    </Section>
    <Section width={300}>
      <div style="display: flex;">
        <Button joined="start" {onclick} size="wide">Delete</Button>
        <Button joined="end" {onclick} size="wide">
          Keep as mine with a long text
        </Button>
      </div>
    </Section>
  </Scene>
</Story>

<Story name="Light Fast" asChild>
  <Scene route="fast">
    <Section
      active="button:nth-child(3)"
      focus="button:nth-child(4)"
      hover="button:nth-child(2)"
    >
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button disabled {icon} {onclick} variant="main">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button disabled {icon} {onclick} variant="attention">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" disabled {icon} {onclick}>Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button disabled {icon} {onclick} variant="plain">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section>
      <Button {icon} loader {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
    </Section>
    <Section>
      <div style="display: flex; width: fit-content;">
        <Button joined="start" {onclick}>Start</Button>
        <Button joined="middle" {onclick}>Middle</Button>
        <Button joined="end" {onclick}>End</Button>
      </div>
    </Section>
  </Scene>
</Story>

<Story
  name="Dark Slow"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
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
      <Button disabled {icon} {onclick} variant="main">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button disabled {icon} {onclick} variant="attention">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" disabled {icon} {onclick}>Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button disabled {icon} {onclick} variant="plain">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section>
      <Button {icon} loader {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
    </Section>
    <Section>
      <div style="display: flex; width: fit-content;">
        <Button joined="start" {onclick}>Start</Button>
        <Button joined="middle" {onclick}>Middle</Button>
        <Button joined="end" {onclick}>End</Button>
      </div>
    </Section>
  </Scene>
</Story>

<Story
  name="Dark Fast"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Scene route="fast">
    <Section
      active="button:nth-child(3)"
      focus="button:nth-child(4)"
      hover="button:nth-child(2)"
    >
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button {icon} {onclick} variant="main">Main</Button>
      <Button disabled {icon} {onclick} variant="main">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button {icon} {onclick} variant="attention">Attention</Button>
      <Button disabled {icon} {onclick} variant="attention">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)" main>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button {icon} {onclick} variant="secondary">Secondary</Button>
      <Button disabled {icon} {onclick} variant="secondary">Disabled</Button>
      <Button
        aria-pressed="true"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled
      </Button>
      <Button
        aria-pressed="true"
        color="success"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Success
      </Button>
      <Button
        aria-pressed="true"
        color="dangerous"
        {icon}
        {onclick}
        size="icon"
        variant="secondary"
      >
        Toggled Dangerous
      </Button>
      <Button color="success" {icon} {onclick} variant="secondary">
        Success
      </Button>
      <Button color="success" {icon} {onclick} variant="plain">Success</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" {icon} {onclick}>Dangerous</Button>
      <Button color="dangerous" disabled {icon} {onclick}>Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button {icon} {onclick} variant="plain">Plain</Button>
      <Button disabled {icon} {onclick} variant="plain">Disabled</Button>
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" {icon} {onclick} variant="plain">
        Plain Secondary
      </Button>
      <Button color="secondary" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section active="button:nth-child(3)" hover="button:nth-child(2)">
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" {icon} {onclick} variant="plain">
        Plain Dangerous
      </Button>
      <Button color="dangerous" disabled {icon} {onclick} variant="plain"
        >Disabled</Button
      >
    </Section>
    <Section>
      <Button {icon} loader {onclick} variant="main">Main</Button>
      <Button href="/disabled" {icon} loader variant="secondary">
        Secondary
      </Button>
    </Section>
    <Section>
      <div style="display: flex; width: fit-content;">
        <Button joined="start" {onclick}>Start</Button>
        <Button joined="middle" {onclick}>Middle</Button>
        <Button joined="end" {onclick}>End</Button>
      </div>
    </Section>
  </Scene>
</Story>
