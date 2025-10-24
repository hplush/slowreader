<script context="module" lang="ts">
  import { popups } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import NotFoundPopup from '../../popups/not-found.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: NotFoundPopup,
    title: 'Popups/NotFound'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <NotFoundPopup popup={popups.refresh('1')} />
  </Scene>
</Story>
