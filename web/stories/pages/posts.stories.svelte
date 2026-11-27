<script context="module" lang="ts">
  import {
    autoplayVideos,
    markReadOn,
    openWarnings,
    removeTrackers,
    saveDataMode
  } from '@slowreader/core'
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
      markReadOn.set('none')
      openWarnings.set(true)
      removeTrackers.set(false)
      autoplayVideos.set('free')
    }}
    route="posts"
  >
    <PostsPage />
  </Scene>
</Story>

<Story name="Unknown Network" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    network="unknown"
    oninit={() => {
      autoplayVideos.set('always')
      saveDataMode.set('on')
    }}
    route="posts"
  >
    <PostsPage />
  </Scene>
</Story>
