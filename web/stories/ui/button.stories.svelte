<script context="module" lang="ts">
  import Button from '../../ui/button.svelte'

  export const meta = {
    component: Button,
    title: 'UI/Button'
  }
</script>

<script lang="ts">
  import { mdiPlusCircleOutline, mdiTrashCanOutline } from '@mdi/js'
  import { Story } from '@storybook/addon-svelte-csf'
  import { onMount } from 'svelte'

  import { getURL } from '../../stores/router.js'
  import CardActions from '../../ui/card-actions.svelte'
  import Card from '../../ui/card.svelte'
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
    <Button
      on:click={() => {
        clicks += 1
      }}
    >
      Base
    </Button>
    <div class="counter">{clicks}</div>
  </Section>
  <Section active="button:nth-child(2)" hover="button:nth-child(1)">
    <CardActions>
      <Button>Hover</Button>
      <Button>Pressed</Button>
      <Button icon={mdiPlusCircleOutline}>Icon</Button>
      <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
    </CardActions>
  </Section>
  <Section focus="button:first-child">
    <div bind:this={focus} class="buttons">
      <Button>Focus</Button>
      <Button>Animation</Button>
    </div>
  </Section>
  <Section><Button wide>Wide</Button></Section>
  <Section>
    <Button
      hotkey="k"
      on:click={() => {
        keyups += 1
      }}>Hot Key</Button
    >
    <div class="counter">{keyups}</div>
  </Section>
  <Section hotkeys={false}>
    <Button hotkey="p">Hot Key on phone</Button>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <Card>
      <CardActions>
        <Button>In card</Button>
        <Button>Hover</Button>
        <Button>Focus</Button>
        <Button>Pressed</Button>
        <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
      </CardActions>
    </Card>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <Card>
      <CardActions>
        <Button secondary>Secondary</Button>
        <Button secondary>Hover</Button>
        <Button secondary>Focus</Button>
        <Button secondary>Pressed</Button>
        <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
        <Button hotkey="h" secondary>Hot Key</Button>
        <Button hiddenLabel="Icon" icon={mdiPlusCircleOutline} secondary />
        <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
      </CardActions>
    </Card>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <CardActions>
      <Button secondary>Secondary</Button>
      <Button secondary>Hover</Button>
      <Button secondary>Focus</Button>
      <Button secondary>Pressed</Button>
      <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
      <Button hotkey="l" secondary>Hot Key</Button>
      <Button hiddenLabel="Icon" icon={mdiPlusCircleOutline} secondary />
      <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
    </CardActions>
  </Section>
  <Section>
    <CardActions>
      <Button href="#" secondary>Link</Button>
      <Button
        hiddenLabel="Labelless"
        href={getURL('slowAll')}
        icon={mdiPlusCircleOutline}
        secondary
      />
      <Button
        hotkey="l"
        href={getURL('slowAll')}
        icon={mdiPlusCircleOutline}
        wide
      >
        Link
      </Button>
    </CardActions>
  </Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'light' } }}>
  <Scene slow>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <CardActions>
        <Button>Base</Button>
        <Button>Hover</Button>
        <Button>Focus</Button>
        <Button>Pressed</Button>
        <Button hotkey="k">Hot Key</Button>
        <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
      </CardActions>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <Card>
        <CardActions>
          <Button>In card</Button>
          <Button>Hover</Button>
          <Button>Focus</Button>
          <Button>Pressed</Button>
          <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
        </CardActions>
      </Card>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <CardActions>
        <Button secondary>Secondary</Button>
        <Button secondary>Hover</Button>
        <Button secondary>Focus</Button>
        <Button secondary>Pressed</Button>
        <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
        <Button hotkey="l" secondary>Hot Key</Button>
        <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
      </CardActions>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <Card>
        <CardActions>
          <Button secondary>Secondary</Button>
          <Button secondary>Hover</Button>
          <Button secondary>Focus</Button>
          <Button secondary>Pressed</Button>
          <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
          <Button hotkey="h" secondary>Hot Key</Button>
          <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
        </CardActions>
      </Card>
    </Section>
  </Scene>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <CardActions>
      <Button>Base</Button>
      <Button>Hover</Button>
      <Button>Focus</Button>
      <Button>Pressed</Button>
      <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
    </CardActions>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <Card>
      <CardActions>
        <Button>In card</Button>
        <Button>Hover</Button>
        <Button>Focus</Button>
        <Button>Pressed</Button>
        <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
      </CardActions>
    </Card>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <CardActions>
      <Button secondary>Secondary</Button>
      <Button secondary>Hover</Button>
      <Button secondary>Focus</Button>
      <Button secondary>Pressed</Button>
      <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
      <Button hotkey="l" secondary>Hot Key</Button>
      <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
    </CardActions>
  </Section>
  <Section
    active="button:nth-child(4)"
    focus="button:nth-child(3)"
    hover="button:nth-child(2)"
  >
    <Card>
      <CardActions>
        <Button secondary>Secondary</Button>
        <Button secondary>Hover</Button>
        <Button secondary>Focus</Button>
        <Button secondary>Pressed</Button>
        <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
        <Button hotkey="h" secondary>Hot Key</Button>
        <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
      </CardActions>
    </Card>
  </Section>
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene slow>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <CardActions>
        <Button>Base</Button>
        <Button>Hover</Button>
        <Button>Focus</Button>
        <Button>Pressed</Button>
        <Button hotkey="k">Hot Key</Button>
        <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
      </CardActions>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <Card>
        <CardActions>
          <Button>In card</Button>
          <Button>Hover</Button>
          <Button>Focus</Button>
          <Button>Pressed</Button>
          <Button dangerous icon={mdiTrashCanOutline}>Delete</Button>
        </CardActions>
      </Card>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <CardActions>
        <Button secondary>Secondary</Button>
        <Button secondary>Hover</Button>
        <Button secondary>Focus</Button>
        <Button secondary>Pressed</Button>
        <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
        <Button hotkey="l" secondary>Hot Key</Button>
        <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
      </CardActions>
    </Section>
    <Section
      active="button:nth-child(4)"
      focus="button:nth-child(3)"
      hover="button:nth-child(2)"
    >
      <Card>
        <CardActions>
          <Button secondary>Secondary</Button>
          <Button secondary>Hover</Button>
          <Button secondary>Focus</Button>
          <Button secondary>Pressed</Button>
          <Button icon={mdiPlusCircleOutline} secondary>Icon</Button>
          <Button hotkey="h" secondary>Hot Key</Button>
          <Button dangerous icon={mdiTrashCanOutline} secondary>Delete</Button>
        </CardActions>
      </Card>
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
