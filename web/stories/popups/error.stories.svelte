<script context="module" lang="ts">
  import { commonMessages, popups } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import ErrorPopup from '../../popups/error.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: ErrorPopup,
    title: 'Popups/Error'
  })
</script>

<Story name="Not Found" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <ErrorPopup popup={popups.refresh('1')} />
  </Scene>
</Story>

<Story name="Server Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <ErrorPopup
      popup={{
        ...popups.refresh('1'),
        error: commonMessages.get().error5xx
      }}
    />
  </Scene>
</Story>
