<script lang="ts">
  import { welcomeMessages as t, welcomeTodo } from '@slowreader/core'

  import { extensionStore } from '../main/extension.ts'
  import { mobileInstall } from '../stores/install.ts'
  import { tabletMedia } from '../stores/media-queries.ts'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
  import WelcomeTodo from '../ui/welcome-todo.svelte'
</script>

<ThinPage title={$t.pageTitle}>
  <Stack gap="xl">
    <Title>{$t.title}</Title>
    <WelcomeTodo
      extension={$tabletMedia ? undefined : extensionStore}
      install={$mobileInstall}
      todo={$welcomeTodo}
    />
  </Stack>
</ThinPage>
