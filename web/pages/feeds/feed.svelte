<script lang="ts">
  import type { FeedReader } from '@slowreader/core'

  import Feed from '../../ui/feed/index.svelte'

  let { feedUrl, reader }: { feedUrl?: string; reader: FeedReader } = $props()
  let { authors, list, userPostUrl } = $derived(reader)
</script>

<Feed authors={$authors} {feedUrl} posts={$list} userPostUrl={$userPostUrl} />
