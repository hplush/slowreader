<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import NotFoundPage from '../../pages/not-found.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: NotFoundPage,
    title: 'Pages/NotFound'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="notFound" user={false}>
    <NotFoundPage />
  </Scene>
</Story>
