<script lang="ts" module>
  import { mdiChevronRight } from '@mdi/js'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Links, { type Link } from '../../ui/links.svelte'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Links,
    title: 'UI/Links'
  })

  function links(
    variant: 'normal' | 'read',
    states: string[]
  ): Link<{ title: string }>[] {
    let name = variant === 'read' ? 'Read' : 'Normal'
    return states.map(state => {
      let title = state ? `${name} ${state}` : name
      return {
        href: '#',
        id: title,
        item: { title },
        mark: mdiChevronRight,
        variant
      }
    })
  }
</script>

{#snippet title(link: { title: string })}
  {link.title}
{/snippet}

{#snippet currents(state: string)}
  <Links
    anchor="link"
    current={`Normal ${state}`}
    item={title}
    links={links('normal', [state])}
  />
  <Links
    anchor="link"
    current={`Read ${state}`}
    item={title}
    links={links('read', [state])}
  />
{/snippet}

{#snippet variants()}
  <Section
    active="li:nth-child(3) a"
    focus="li:nth-child(4) a"
    hover="li:nth-child(2) a"
    stack
    width={300}
  >
    <Links
      anchor="link"
      item={title}
      links={links('normal', ['', 'hover', 'active', 'focus'])}
    />
    <Links
      anchor="link"
      item={title}
      links={links('read', ['', 'hover', 'active', 'focus'])}
    />
  </Section>
  <Section stack width={300}>
    {@render currents('current')}
  </Section>
  <Section hover stack width={300}>
    {@render currents('current hover')}
  </Section>
  <Section active hover stack width={300}>
    {@render currents('current hover active')}
  </Section>
{/snippet}

<Story name="Light Slow" asChild>
  <Scene>
    {@render variants()}
  </Scene>
</Story>

<Story name="Light Fast" asChild>
  <Scene route="fast">
    {@render variants()}
  </Scene>
</Story>

<Story
  name="Dark Slow"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Scene>
    {@render variants()}
  </Scene>
</Story>

<Story
  name="Dark Fast"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Scene route="fast">
    {@render variants()}
  </Scene>
</Story>
