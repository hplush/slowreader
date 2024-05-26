<script context="module" lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import { MOCKED_POSTS } from './mocks.js'
  import MockedSlow from './slow-mock-env.svelte'

  export const meta = {
    component: MockedSlow,
    title: 'Pages/Posts/Slow'
  }
</script>

<Story name="Loading" parameters={{ layout: 'fullscreen' }}>
  <MockedSlow />
</Story>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <MockedSlow state={{ isLoading: false, list: [] }} />
</Story>

<Story name="Few posts" parameters={{ layout: 'fullscreen' }}>
  <MockedSlow state={{ isLoading: false, list: MOCKED_POSTS.slice(0, 3) }} />
</Story>

<Story name="Opened post" parameters={{ layout: 'fullscreen' }}>
  <MockedSlow
    post={MOCKED_POSTS[1]}
    state={{ isLoading: false, list: MOCKED_POSTS.slice(0, 3) }}
  />
</Story>

<Story name="Many posts" parameters={{ layout: 'fullscreen' }}>
  <MockedSlow showPagination state={{ isLoading: false, list: MOCKED_POSTS }} />
</Story>
