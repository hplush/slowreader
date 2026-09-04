<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import MenuPage from '../../pages/menu.svelte'
  import Navbar from '../../ui/navbar/index.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: MenuPage,
    title: 'Pages/Menu'
  })
</script>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="menu">
    <MenuPage />
    <Navbar />
  </Scene>
</Story>

<Story
  name="Tablet"
  asChild
  globals={{ viewport: { value: 'tablet' } }}
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route="menu">
    <MenuPage />
    <Navbar />
  </Scene>
</Story>
