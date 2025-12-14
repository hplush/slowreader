<script lang="ts">
  import { mdiChevronRight } from '@mdi/js'
  import {
    type FeedLoader,
    type FeedValue,
    getPopupId,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Links from './links.svelte'

  type FeedLike = FeedLoader | FeedValue

  let {
    current,
    id,
    list
  }: {
    current: string | undefined
    id?: string
    list: readonly FeedLike[]
  } = $props()

  let links = $derived(
    list.map(feed => ({
      controls: getPopupId('feed', feed.url),
      href: getPopupHash($router, 'feed', feed.url),
      id: feed.url,
      item: feed,
      mark: mdiChevronRight
    }))
  )
</script>

<Links {id} {current} {links}>
  {#snippet item(feed)}
    {feed.title}
  {/snippet}
</Links>
