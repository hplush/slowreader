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
      }}
    >
      Base
    </UiButton>
    <div class="counter">{clicks}</div>
  </Section>
  <Section active="button:nth-child(2)" hover="button:nth-child(1)">
    <UiCardActions>
      <UiButton>Hover</UiButton>
      <UiButton>Pressed</UiButton>
      <UiButton icon={mdiPlusCircleOutline}>Icon</UiButton>
    </UiCardActions>
  </Section>
  <Section focus="button:first-child">
    <div bind:this={focus} class="buttons">
      <UiButton>Focus</UiButton>
      <UiButton>Animation</UiButton>
    </div>
  </Section>
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
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiCard>
      <UiCardActions>
        <UiButton>In card</UiButton>
        <UiButton>Hover</UiButton>
        <UiButton>Focus</UiButton>
        <UiButton>Pressed</UiButton>
      </UiCardActions>
    </UiCard>
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
        <UiButton hiddenLabel="Icon" icon={mdiPlusCircleOutline} secondary />
      </UiCardActions>
    </UiCard>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiCardActions>
      <UiButton secondary>Secondary</UiButton>
      <UiButton secondary>Hover</UiButton>
      <UiButton secondary>Focus</UiButton>
      <UiButton secondary>Pressed</UiButton>
      <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
      <UiButton hotkey="l" secondary>Hot Key</UiButton>
      <UiButton hiddenLabel="Icon" icon={mdiPlusCircleOutline} secondary />
    </UiCardActions>
  </Section>
  <Section>
    <UiCardActions>
      <UiButton href="#" secondary>Link</UiButton>
      <UiButton
        hiddenLabel="Labelless"
        href={getURL('slowAll')}
        icon={mdiPlusCircleOutline}
        secondary
      />
      <UiButton
        hotkey="l"
        href={getURL('slowAll')}
        icon={mdiPlusCircleOutline}
        wide
      >
        Link
      </UiButton>
    </UiCardActions>
  </Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'light' } }}>
  <Scene slow>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCardActions>
        <UiButton>Base</UiButton>
        <UiButton>Hover</UiButton>
        <UiButton>Focus</UiButton>
        <UiButton>Pressed</UiButton>
        <UiButton hotkey="k">Hot Key</UiButton>
      </UiCardActions>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCard>
        <UiCardActions>
          <UiButton>In card</UiButton>
          <UiButton>Hover</UiButton>
          <UiButton>Focus</UiButton>
          <UiButton>Pressed</UiButton>
        </UiCardActions>
      </UiCard>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCardActions>
        <UiButton secondary>Secondary</UiButton>
        <UiButton secondary>Hover</UiButton>
        <UiButton secondary>Focus</UiButton>
        <UiButton secondary>Pressed</UiButton>
        <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
        <UiButton hotkey="l" secondary>Hot Key</UiButton>
      </UiCardActions>
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
  </Scene>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiCardActions>
      <UiButton>Base</UiButton>
      <UiButton>Hover</UiButton>
      <UiButton>Focus</UiButton>
      <UiButton>Pressed</UiButton>
    </UiCardActions>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiCard>
      <UiCardActions>
        <UiButton>In card</UiButton>
        <UiButton>Hover</UiButton>
        <UiButton>Focus</UiButton>
        <UiButton>Pressed</UiButton>
      </UiCardActions>
    </UiCard>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <UiCardActions>
      <UiButton secondary>Secondary</UiButton>
      <UiButton secondary>Hover</UiButton>
      <UiButton secondary>Focus</UiButton>
      <UiButton secondary>Pressed</UiButton>
      <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
      <UiButton hotkey="l" secondary>Hot Key</UiButton>
    </UiCardActions>
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
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene slow>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCardActions>
        <UiButton>Base</UiButton>
        <UiButton>Hover</UiButton>
        <UiButton>Focus</UiButton>
        <UiButton>Pressed</UiButton>
        <UiButton hotkey="k">Hot Key</UiButton>
      </UiCardActions>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCard>
        <UiCardActions>
          <UiButton>In card</UiButton>
          <UiButton>Hover</UiButton>
          <UiButton>Focus</UiButton>
          <UiButton>Pressed</UiButton>
        </UiCardActions>
      </UiCard>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <UiCardActions>
        <UiButton secondary>Secondary</UiButton>
        <UiButton secondary>Hover</UiButton>
        <UiButton secondary>Focus</UiButton>
        <UiButton secondary>Pressed</UiButton>
        <UiButton icon={mdiPlusCircleOutline} secondary>Icon</UiButton>
        <UiButton hotkey="l" secondary>Hot Key</UiButton>
      </UiCardActions>
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
