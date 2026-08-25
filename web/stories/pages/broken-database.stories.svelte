<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import BrokenDatabasePage from '../../pages/broken-database.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: BrokenDatabasePage,
    title: 'Pages/BrokenDatabase'
  })
</script>

<script lang="ts">
  import { brokenDatabase } from '@slowreader/core'
</script>

<Story name="Light" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      brokenDatabase.set({
        at: new Date(),
        error: 'Database disk image is malformed',
        reason: 'broken-db'
      })
    }}
    route="brokenDatabase"
    user={false}
  >
    <BrokenDatabasePage />
  </Scene>
</Story>
