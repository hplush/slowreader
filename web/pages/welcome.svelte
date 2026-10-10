<script lang="ts">
  import { welcomeMessages as t, welcomeTodo } from '@slowreader/core'

  import { extensionStore } from '../main/extension.ts'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
  import WelcomeTodo from '../ui/welcome-todo.svelte'
</script>

<ThinPage title={$t.pageTitle}>
  <Stack gap="xl">
    <Title>{$t.title}</Title>
    <WelcomeTodo extension={extensionStore} todo={$welcomeTodo} />
  </Stack>
</ThinPage>
