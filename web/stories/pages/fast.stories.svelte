<script context="module" lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Fast from '../../pages/fast.svelte'
  import Scene from '../scene.svelte'
  import { MOCKED_FAST_FEED, MOCKED_POSTS } from './post-mocks.ts'

  export const meta = {
    component: Fast,
    title: 'Pages/Fast'
  }
</script>

<Story name="Loading" parameters={{ layout: 'fullscreen' }}>
  <Scene><Fast /></Scene>
</Story>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <Scene fast><Fast /></Scene>
</Story>

<Story name="Few posts" parameters={{ layout: 'fullscreen' }}>
  <Scene fasts={MOCKED_FAST_FEED}><Fast /></Scene>
</Story>

<Story name="Opened post" parameters={{ layout: 'fullscreen' }}>
  <Scene fasts={MOCKED_FAST_FEED} openedPost={MOCKED_POSTS[0]}><Fast /></Scene>
</Story>

<Story name="Many posts" parameters={{ layout: 'fullscreen' }}>
  <Scene fasts={MOCKED_FAST_FEED} showPagination><Fast /></Scene>
</Story>
