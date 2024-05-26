<script context="module" lang="ts">
  import MockedFast from './fast-mock-env.svelte'
  import { Story } from '@storybook/addon-svelte-csf'
  import { MOCKED_FAST_FEED, MOCKED_POSTS } from './mocks.js'

  export const meta = {
    component: MockedFast,
    title: 'Pages/Posts/Fast'
  }
</script>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <MockedFast />
</Story>

<Story name="Few posts" parameters={{ layout: 'fullscreen' }}>
  <MockedFast posts={MOCKED_FAST_FEED.slice(0, 3)} />
</Story>

<Story name="Opened post" parameters={{ layout: 'fullscreen' }}>
  <MockedFast
    posts={MOCKED_FAST_FEED.slice(0, 3)}
    openedPost={MOCKED_POSTS[0]}
  />
</Story>

<Story name="Many posts" parameters={{ layout: 'fullscreen' }}>
  <MockedFast posts={MOCKED_FAST_FEED} showNextButton />
</Story>
