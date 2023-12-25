<script context="module" lang="ts">
  import UiButton from '../../ui/button.svelte'

  export const meta = {
    component: UiButton,
    title: 'UI/Button'
  }
</script>

<script lang="ts">
  import { mdiPlusCircleOutline } from '@mdi/js'
  import { Story } from '@storybook/addon-svelte-csf'
  import { onMount } from 'svelte'

  import { getURL } from '../../stores/router.js'
  import UiCardActions from '../../ui/card-actions.svelte'
  import UiCard from '../../ui/card.svelte'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let focus: HTMLDivElement | undefined

  let clicks = 0
  let keyups = 0

  onMount(() => {
    let focusAnimation = setInterval(() => {
      if (focus) {
        focus
          .querySelector(':first-child')!
          .classList.toggle('is-pseudo-focus-visible')
        focus
          .querySelector(':last-child')!
          .classList.toggle('is-pseudo-focus-visible')
      }
    }, 2000)
    return () => {
      clearInterval(focusAnimation)
    }
  })
</script>

<Story name="Base">
  <Section>
    <UiButton
      on:click={() => {
        clicks += 1
      }}>Base</UiButton
    >
    <div class="counter">{clicks}</div>
  </Section>
  <Section>
    <UiCard>
      <UiCardActions><UiButton>Inside card</UiButton></UiCardActions>
    </UiCard>
  </Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus="button:first-child">
    <div bind:this={focus} class="buttons">
      <UiButton>Focus</UiButton>
      <UiButton>Animation</UiButton>
    </div>
  </Section>
  <Section active><UiButton>Pressed</UiButton></Section>
  <Section><UiButton icon={mdiPlusCircleOutline}>Icon</UiButton></Section>
  <Section><UiButton wide>Wide</UiButton></Section>
  <Section>
    <UiButton
      hotkey="k"
      on:click={() => {
        keyups += 1
      }}>Hot Key</UiButton
    >
    <div class="counter">{keyups}</div>
  </Section>
  <Section hotkeys={false}>
    <UiButton hotkey="p">Hot Key on phone</UiButton>
  </Section>
  <Section>
    <UiButton
      hotkey="l"
      href={getURL('slowAll')}
      icon={mdiPlusCircleOutline}
      wide
    >
      Link
    </UiButton>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiCard>
      <UiCardActions>
        <UiButton secondary>Secondary</UiButton>
        <UiButton secondary>Hover</UiButton>
        <UiButton secondary>Focus</UiButton>
        <UiButton secondary>Pressed</UiButton>
        <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
        <UiButton hotkey="h" secondary>Hot Key</UiButton>
      </UiCardActions>
    </UiCard>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiButton secondary>Secondary</UiButton>
    <UiButton secondary>Hover</UiButton>
    <UiButton secondary>Focus</UiButton>
    <UiButton secondary>Pressed</UiButton>
    <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
    <UiButton hotkey="f" secondary>Hot Key</UiButton>
  </Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'light' } }}>
  <Scene slow>
    <Section><UiButton>Base</UiButton></Section>
    <Section>
      <UiCard>
        <UiCardActions><UiButton>Inside card</UiButton></UiCardActions>
      </UiCard>
    </Section>
    <Section hover><UiButton>Hover</UiButton></Section>
    <Section focus><UiButton>Focus</UiButton></Section>
    <Section active><UiButton>Pressed</UiButton></Section>
    <Section><UiButton hotkey="k">Hot Key</UiButton></Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCard>
        <UiCardActions>
          <UiButton secondary>Secondary</UiButton>
          <UiButton secondary>Hover</UiButton>
          <UiButton secondary>Focus</UiButton>
          <UiButton secondary>Pressed</UiButton>
          <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
          <UiButton hotkey="h" secondary>Hot Key</UiButton>
        </UiCardActions>
      </UiCard>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiButton secondary>Secondary</UiButton>
      <UiButton secondary>Hover</UiButton>
      <UiButton secondary>Focus</UiButton>
      <UiButton secondary>Pressed</UiButton>
      <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
      <UiButton hotkey="f" secondary>Hot Key</UiButton>
    </Section>
  </Scene>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section><UiButton>Base</UiButton></Section>
  <Section>
    <UiCard>
      <UiCardActions><UiButton>Inside card</UiButton></UiCardActions>
    </UiCard>
  </Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
  <Section><UiButton hotkey="k">Hot Key</UiButton></Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiCard>
      <UiCardActions>
        <UiButton secondary>Secondary</UiButton>
        <UiButton secondary>Hover</UiButton>
        <UiButton secondary>Focus</UiButton>
        <UiButton secondary>Pressed</UiButton>
        <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
        <UiButton hotkey="h" secondary>Hot Key</UiButton>
      </UiCardActions>
    </UiCard>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiButton secondary>Secondary</UiButton>
    <UiButton secondary>Hover</UiButton>
    <UiButton secondary>Focus</UiButton>
    <UiButton secondary>Pressed</UiButton>
    <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
    <UiButton hotkey="f" secondary>Hot Key</UiButton>
  </Section>
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene slow>
    <Section><UiButton>Base</UiButton></Section>
    <Section>
      <UiCard>
        <UiCardActions><UiButton>Inside card</UiButton></UiCardActions>
      </UiCard>
    </Section>
    <Section hover><UiButton>Hover</UiButton></Section>
    <Section focus><UiButton>Focus</UiButton></Section>
    <Section active><UiButton>Pressed</UiButton></Section>
    <Section><UiButton hotkey="k">Hot Key</UiButton></Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCard>
        <UiCardActions>
          <UiButton secondary>Secondary</UiButton>
          <UiButton secondary>Hover</UiButton>
          <UiButton secondary>Focus</UiButton>
          <UiButton secondary>Pressed</UiButton>
          <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
          <UiButton hotkey="h" secondary>Hot Key</UiButton>
        </UiCardActions>
      </UiCard>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiButton secondary>Secondary</UiButton>
      <UiButton secondary>Hover</UiButton>
      <UiButton secondary>Focus</UiButton>
      <UiButton secondary>Pressed</UiButton>
      <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
      <UiButton hotkey="f" secondary>Hot Key</UiButton>
    </Section>
  </Scene>
</Story>

<style>
  .buttons {
    display: flex;
    gap: var(--padding-m);
  }

  .counter {
    position: absolute;
    display: inline-block;
    height: var(--control-height);
    margin-inline-start: var(--padding-l);
    line-height: var(--control-height);
  }
</style>
