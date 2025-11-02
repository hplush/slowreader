<script context="module" lang="ts">
  import { popups } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import LoadingPopup from '../../popups/loading.svelte'
  import PopupShadow from '../../ui/popup-shadow.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: LoadingPopup,
    title: 'Popups/Loading'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <LoadingPopup popup={popups.refresh('1')} />
  </Scene>
</Story>

<Story
  name="Stack"
  asChild
  globals={{ viewport: { value: 'big' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene>
    <PopupShadow index={2} />
    <PopupShadow index={1} />
    <LoadingPopup popup={popups.refresh('1')} />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene>
    <LoadingPopup popup={popups.refresh('1')} />
  </Scene>
</Story>
