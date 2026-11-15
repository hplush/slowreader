<script lang="ts">
  import {
    welcomeMessages as t,
    type WelcomePage,
    welcomeTodo
  } from '@slowreader/core'

  import { extensionStore } from '../main/extension.ts'
  import { mobileInstall } from '../stores/install.ts'
  import { tabletMedia } from '../stores/media-queries.ts'
  import { getURL } from '../stores/url-router.ts'
  import RichText from '../ui/rich-text.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
  import WelcomeTodo from '../ui/welcome-todo.svelte'

  let { page }: { page: WelcomePage } = $props()
  let { telegram } = $derived(page)
</script>

<ThinPage title={$t.pageTitle}>
  <Stack gap="xl">
    <Title>{$t.title}</Title>
    <WelcomeTodo
      extension={$tabletMedia ? undefined : $extensionStore}
      install={$mobileInstall}
      telegram={$telegram}
      todo={$welcomeTodo}
    />
    <RichText secondary text={$t.reset} url={getURL('storage')} />
  </Stack>
</ThinPage>
