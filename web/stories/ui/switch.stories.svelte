<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import Switch from '../../ui/switch.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Switch,
    title: 'UI/Switch'
  })
</script>

<script lang="ts">
  import { mdiImageOutline as icon } from '@mdi/js'

  let storeOff = atom(false)
  let storeOn = atom(true)
  let other = atom(true)
</script>

<Story name="Light" asChild>
  <Section stack width={300}>
    <Switch {icon} label="Base" store={storeOn} />
    <Switch label="Icon-less" store={storeOn} />
    <Switch {icon} label="Off" store={storeOff} />
    <Switch disabled {icon} label="Disabled" store={storeOff} />
    <Switch {icon} label="Reverse" reverseStore={storeOn} />
    <Switch
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
    <Switch {icon} label="Hover" store={other} />
    <Switch {icon} label="Pressed" store={other} />
    <Switch {icon} label="Focus" store={other} />
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section stack width={300}>
    <Switch {icon} label="Base" store={storeOn} />
    <Switch {icon} label="Off" store={storeOff} />
    <Switch disabled {icon} label="Disabled" store={storeOff} />
  </Section>
  <Section
    active="label:nth-child(2)"
    focus="label:nth-child(3) input"
    hover="label:first-child"
    stack
    width={300}
  >
    <Switch {icon} label="Hover" store={other} />
    <Switch {icon} label="Pressed" store={other} />
    <Switch {icon} label="Focus" store={other} />
  </Section>
</Story>
