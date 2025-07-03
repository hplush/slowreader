<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import StartPage from '../../pages/start.svelte'

  let { Story } = defineMeta({
    component: StartPage,
    title: 'Pages/Start'
  })
</script>

<Story name="Light" parameters={{ layout: 'fullscreen' }} />

<Story
  name="Dark"
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
/>

<Story
  name="Mobile"
  globals={{
    viewport: { value: 'mobile1' }
  }}
  parameters={{
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' }
  }}
/>
