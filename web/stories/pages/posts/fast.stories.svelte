<script context="module" lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import FastScene from './fast-scene.svelte'
  import { MOCKED_FAST_FEED, MOCKED_POSTS } from './mocks.js'

  export const meta = {
    component: FastScene,
    title: 'Pages/Fast'
  }
</script>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <FastScene />
</Story>

<Story name="Few posts" parameters={{ layout: 'fullscreen' }}>
  <FastScene posts={MOCKED_FAST_FEED.slice(0, 3)} />
</Story>

<Story name="Opened post" parameters={{ layout: 'fullscreen' }}>
  <FastScene
    openedPost={MOCKED_POSTS[0]}
    posts={MOCKED_FAST_FEED.slice(0, 3)}
  />
</Story>

<Story name="Many posts" parameters={{ layout: 'fullscreen' }}>
  <FastScene posts={MOCKED_FAST_FEED} showNextButton />
</Story>
