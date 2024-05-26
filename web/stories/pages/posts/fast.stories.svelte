<script context="module" lang="ts">
  import MockedFast from './fast-mock-env.svelte'
  import { Story } from '@storybook/addon-svelte-csf'
  import { mockedFast } from './mocks.js'

  export const meta = {
    component: MockedFast,
    title: 'Pages/Post/Fast'
  }
</script>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <MockedFast />
</Story>

<Story name="Have posts" parameters={{ layout: 'fullscreen' }}>
  <MockedFast posts={mockedFast.slice(0, 3)} />
</Story>

<Story name="Next button" parameters={{ layout: 'fullscreen' }}>
  <MockedFast posts={mockedFast} showNextButton />
</Story>

<Story name="Opened post" parameters={{ layout: 'fullscreen' }}>
  <MockedFast posts={mockedFast.slice(0, 3)} openedPost={mockedFast[0].post} />
</Story>
