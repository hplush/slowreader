<script lang="ts">
  import { mdiPlusCircleOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    addCategory,
    changeFeed,
    type FeedPopup,
    getPopupId,
    organizeMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Input from '../ui/input.svelte'
  import Label from '../ui/label.svelte'
  import Loader from '../ui/loader.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Posts from '../ui/posts.svelte'
  import Radio from '../ui/radio.svelte'
  import Select from '../ui/select.svelte'
  import Stack from '../ui/stack.svelte'

  let { popup }: { popup: FeedPopup } = $props()

  let { categories, feed, posts } = $derived(popup)
</script>

<Popup
  id={getPopupId(popup.name, popup.param)}
  reading={$feed ? $feed.reading : undefined}
>
  {#snippet header()}
    {#if !$feed}
      <Button icon={mdiPlusCircleOutline} onclick={popup.add} variant="main">
        {$t.addFeed}
      </Button>
    {:else}
      <Button
        icon={mdiTrashCanOutline}
        onclick={() => {
          if (confirm($t.deleteConform)) {
            popup.remove()
          }
        }}
        variant="secondary-dangerous"
      >
        {$t.deleteFeed}
      </Button>
    {/if}
  {/snippet}
  <Stack gap="l">
    <Output label={$t.feedUrl} value={popup.param} />
    {#if $feed}
      <Input
        label={$t.title}
        onchange={title => {
          changeFeed($feed.id, { title })
        }}
        value={$feed.title}
      />
      <Stack row>
        <Radio
          label={$t.type}
          onchange={reading => {
            changeFeed($feed.id, { reading })
          }}
          size="wide"
          value={$feed.reading}
          values={[
            ['slow', $t.slow],
            ['fast', $t.fast]
          ]}
        />
        <Select
          label={$t.category}
          onchange={async value => {
            if (value === 'new') {
              let title = prompt($t.categoryName)
              if (!title) return
              value = await addCategory({ title })
            }
            changeFeed($feed.id, { categoryId: value })
          }}
          value={$feed.categoryId}
          values={$categories}
        />
      </Stack>
    {/if}
    <Stack gap="xs">
      <Label tag="h2">{$t.feedPosts}</Label>
      {#if $posts.isLoading}
        <Loader />
      {:else}
        <Posts list={$posts.list} />
        {#if $posts.hasNext}
          <Button onclick={posts.next} size="wide">{$t.morePosts}</Button>
        {/if}
      {/if}
    </Stack>
  </Stack>
</Popup>
