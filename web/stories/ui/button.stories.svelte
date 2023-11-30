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

  import UiCard from '../../ui/card.svelte'
  import Section from '../section.svelte'

  let focus: HTMLDivElement | undefined

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
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
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
  <Section><UiButton hotkey="k">Hot Key</UiButton></Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'lightSlow' } }}>
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
  <Section><UiButton hotkey="k">Hot Key</UiButton></Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
  <Section><UiButton hotkey="k">Hot Key</UiButton></Section>
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'darkSlow' } }}>
  <Section><UiButton>Base</UiButton></Section>
  <Section><UiCard><UiButton>Inside card</UiButton></UiCard></Section>
  <Section hover><UiButton>Hover</UiButton></Section>
  <Section focus><UiButton>Focus</UiButton></Section>
  <Section active><UiButton>Pressed</UiButton></Section>
  <Section><UiButton hotkey="k">Hot Key</UiButton></Section>
</Story>

<style>
  .buttons {
    display: flex;
    gap: var(--padding-m);
  }
</style>
