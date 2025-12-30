<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import Toggle from '../../ui/toggle.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Toggle,
    title: 'UI/Toggle'
  })
</script>

<script lang="ts">
  import { mdiImageOutline as icon } from '@mdi/js'

  let storeOff = atom(false)
  let storeOn = atom(true)
  let otherOn = atom(true)
  let otherOff = atom(false)
</script>

<Story name="Light" asChild>
  <Section stack width={300}>
    <Toggle {icon} label="Base" store={storeOn} />
    <Toggle label="Icon-less" store={storeOn} />
    <Toggle {icon} label="Off" store={storeOff} />
    <Toggle {icon} label="Icon" size="icon" store={storeOn} />
    <Toggle {icon} label="Icon Off" size="icon" store={storeOff} />
    <Toggle
      {icon}
      label="Very-very long label with longlonglongwordthat couldbreakcontainer"
      store={storeOn}
    />
  </Section>
  <Section
    active="label:nth-child(2)"
    focus="label:nth-child(3) input"
    hover="label:first-child"
    stack
    width={300}
  >
    <Toggle {icon} label="Hover" store={otherOn} />
    <Toggle {icon} label="Pressed" store={otherOn} />
    <Toggle {icon} label="Focus" store={otherOn} />
  </Section>
  <Section
    active="label:nth-child(2)"
    focus="label:nth-child(3) input"
    hover="label:first-child"
    stack
    width={300}
  >
    <Toggle {icon} label="Hover" store={otherOff} />
    <Toggle {icon} label="Pressed" store={otherOff} />
    <Toggle {icon} label="Focus" store={otherOff} />
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section stack width={300}>
    <Toggle {icon} label="Base" store={storeOn} />
    <Toggle label="Icon-less" store={storeOn} />
    <Toggle {icon} label="Off" store={storeOff} />
    <Toggle {icon} label="Icon" size="icon" store={storeOn} />
    <Toggle {icon} label="Icon Off" size="icon" store={storeOff} />
  </Section>
  <Section
    active="label:nth-child(2)"
    focus="label:nth-child(3) input"
    hover="label:first-child"
    stack
    width={300}
  >
    <Toggle {icon} label="Hover" store={otherOn} />
    <Toggle {icon} label="Pressed" store={otherOn} />
    <Toggle {icon} label="Focus" store={otherOn} />
  </Section>
  <Section
    active="label:nth-child(2)"
    focus="label:nth-child(3) input"
    hover="label:first-child"
    stack
    width={300}
  >
    <Toggle {icon} label="Hover" store={otherOff} />
    <Toggle {icon} label="Pressed" store={otherOff} />
    <Toggle {icon} label="Focus" store={otherOff} />
  </Section>
</Story>
