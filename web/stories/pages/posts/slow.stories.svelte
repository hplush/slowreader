<script context="module" lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import { MOCKED_POSTS } from './mocks.js'
  import SlowScene from './slow-scene.svelte'

  export const meta = {
    component: SlowScene,
    title: 'Pages/Slow'
  }
</script>

<Story name="Loading" parameters={{ layout: 'fullscreen' }}>
  <SlowScene />
</Story>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <SlowScene state={{ isLoading: false, list: [] }} />
</Story>

<Story name="Few posts" parameters={{ layout: 'fullscreen' }}>
  <SlowScene state={{ isLoading: false, list: MOCKED_POSTS.slice(0, 3) }} />
</Story>

<Story name="Opened post" parameters={{ layout: 'fullscreen' }}>
  <SlowScene
    post={MOCKED_POSTS[1]}
    state={{ isLoading: false, list: MOCKED_POSTS.slice(0, 3) }}
  />
</Story>

<Story name="Many posts" parameters={{ layout: 'fullscreen' }}>
  <SlowScene showPagination state={{ isLoading: false, list: MOCKED_POSTS }} />
</Story>
