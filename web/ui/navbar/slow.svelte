<script lang="ts">
  import {
    GENERAL_CATEGORY,
    router,
    commonMessages as t,
    visibleSlowMenu
  } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import FeedAvatar from '../feed-avatar.svelte'
  import NavbarCategory from './category.svelte'
  import NavbarItem from './item.svelte'
  import NavbarLater from './later.svelte'
</script>

<NavbarLater />

{#each $visibleSlowMenu as [category, feeds] (category.id)}
  <NavbarCategory
    id={category.id}
    name={category.id === GENERAL_CATEGORY
      ? $t.generalCategory
      : category.title}
    current={$router.route === 'slow' &&
      $router.params.category === category.id}
    href={getURL({ params: { category: category.id }, route: 'slow' })}
  >
    {#each feeds as [feed, unread] (feed.id)}
      <NavbarItem
        name={feed.title}
        current={$router.route === 'slow' && $router.params.feed === feed.id}
        href={getURL({ params: { feed: feed.id }, route: 'slow' })}
        number={unread}
        secondary={unread === 0}
      >
        <FeedAvatar avatar={feed.avatar} feedId={feed.id} round={feed.round} />
      </NavbarItem>
    {/each}
  </NavbarCategory>
{/each}
