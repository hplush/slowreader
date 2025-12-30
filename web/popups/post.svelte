<script lang="ts">
  import { mdiEyeCheckOutline, mdiOpenInNew } from '@mdi/js'
  import {
    getPopupId,
    getPostContent,
    i18nFormat,
    type PostPopup,
    router,
    postMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { onNextVisibility } from '../lib/visitibility.ts'
  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import FormattedText from '../ui/formatted-text.svelte'
  import Popup from '../ui/popup.svelte'
  import SmallLink from '../ui/small-link.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import Title from '../ui/title.svelte'
  import Toggle from '../ui/toggle.svelte'

  let { popup }: { popup: PostPopup } = $props()

  let { feed, post, publishedAt, read } = $derived(popup)

  onMount(() => {
    if (popup.read) {
      onNextVisibility(() => {
        popup.read?.set(true)
      })
    }
  })
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  {#snippet header()}
    {#if popup.read}
      <Toggle
        icon={mdiEyeCheckOutline}
        label={$read ? $t.unread : $t.read}
        size="icon"
        store={popup.read}
      />
    {/if}
    {#if $post.url}
      <Button href={$post.url} icon={mdiOpenInNew} size="icon" target="_blank">
        {$t.url}
      </Button>
    {/if}
  {/snippet}
  <Stack>
    <Stack justify="space-between" row width="stretch">
      {#if feed}
        <SmallLink href={getPopupHash($router, 'feed', $feed!.url)}>
          {$feed!.title}
        </SmallLink>
      {:else}
        <div></div>
      {/if}
      <SmallLink href={$post.url} target="_blank">
        {$i18nFormat.time($publishedAt, {
          dateStyle: 'short',
          timeStyle: 'short'
        })}
      </SmallLink>
    </Stack>
    {#if $post.title}
      <Title font="safe">
        <FormattedText html={$post.title} />
      </Title>
    {/if}
    <FormattedText html={getPostContent($post)} />
    {#if $post.url}
      <Button
        href={$post.url}
        icon={mdiOpenInNew}
        size="wide"
        target="_blank"
        variant="attention"
      >
        {$t.url}
      </Button>
    {/if}
    {#if popup.read}
      <Stack row>
        <Switch
          icon={mdiEyeCheckOutline}
          label={$t.readCheckbox}
          store={popup.read}
        />
      </Stack>
    {/if}
  </Stack>
</Popup>
