<script context="module" lang="ts">
  import { hasPassword, pages, syncStatus } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import ProfilePage from '../../pages/profile.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: ProfilePage,
    title: 'Pages/Profile'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="profile">
    <ProfilePage page={pages.profile()} />
  </Scene>
</Story>

<Story name="Local" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasPassword.set(false)
    }}
    route="profile"
  >
    <ProfilePage page={pages.profile()} />
  </Scene>
</Story>

<Story name="Unsaved" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('wait')
    }}
    route="profile"
  >
    <ProfilePage page={pages.profile()} />
  </Scene>
</Story>
