<script lang="ts" module>
  import { mdiPlusCircleOutline, mdiTrashCanOutline } from '@mdi/js'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import { getURL } from '../../stores/router.ts'
  import Button from '../../ui/button.svelte'
  import CardActions from '../../ui/card-actions.svelte'
  import Card from '../../ui/card.svelte'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Button,
    title: 'UI/Button'
  })
</script>

<script lang="ts">
  import { onMount } from 'svelte'

  let focus: HTMLDivElement | undefined

  let clicks = $state(0)
  let keyups = $state(0)

  onMount(() => {
    let focusAnimation = setInterval(() => {
      if (focus) {
        focus
          .querySelector('button:first-child')!
          .classList.toggle('is-pseudo-focus-visible')
        focus
          .querySelector('button:last-child')!
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
      onclick={() => {
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
      onclick={() => {
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
        href={getURL('slow')}
        icon={mdiPlusCircleOutline}
        secondary
      />
      <Button hotkey="l" href={getURL('slow')} icon={mdiPlusCircleOutline} wide>
        Link
      </Button>
    </CardActions>
  </Section>
</Story>

<Story name="Fast">
  <Scene fast>
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

<Story name="Dark Fast" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene fast>
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
    top: 0;
    display: inline-block;
    padding: var(--padding-m);
  }
</style>
