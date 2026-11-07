<script context="module" lang="ts">
  import { openWarnings, removeTrackers } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import PostsPage from '../../pages/posts.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: PostsPage,
    title: 'Pages/Posts'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      openWarnings.set(true)
      removeTrackers.set(false)
    }}
    route="posts"
  >
    <PostsPage />
  </Scene>
</Story>
