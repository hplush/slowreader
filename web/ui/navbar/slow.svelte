<script lang="ts">
  import { router, slowMenu } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import NavbarCategory from './category.svelte'
  import NavbarItem from './item.svelte'
</script>

{#each $slowMenu as [category, feeds] (category.id)}
  <NavbarCategory id={category.id} name={category.title}>
    {#each feeds as [feed, unread] (feed.id)}
      <NavbarItem
        name={feed.title}
        current={$router.route === 'slow' && $router.params.feed === feed.id}
        href={getURL({ params: { feed: feed.id }, route: 'slow' })}
        number={unread}
      />
    {/each}
  </NavbarCategory>
{/each}
