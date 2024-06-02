<script context="module" lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Slow from '../../../pages/slow.svelte'
  import Scene from '../../scene.svelte'
  import { MOCKED_POSTS } from './mocks.js'

  export const meta = {
    component: Slow,
    title: 'Pages/Slow'
  }
</script>

<Story name="Loading" parameters={{ layout: 'fullscreen' }}>
  <Scene><Slow /></Scene>
</Story>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <Scene slowState={{ isLoading: false, list: [] }}><Slow /></Scene>
</Story>

<Story name="Few posts" parameters={{ layout: 'fullscreen' }}>
  <Scene slowState={{ isLoading: false, list: MOCKED_POSTS }}><Slow /></Scene>
</Story>

<Story name="Opened post" parameters={{ layout: 'fullscreen' }}>
  <Scene
    openedPost={MOCKED_POSTS[1]}
    slowState={{ isLoading: false, list: MOCKED_POSTS }}
  >
    <Slow /></Scene
  >
</Story>

<Story name="Many posts" parameters={{ layout: 'fullscreen' }}>
  <Scene showPagination slowState={{ isLoading: false, list: MOCKED_POSTS }}>
    <Slow /></Scene
  >
</Story>
