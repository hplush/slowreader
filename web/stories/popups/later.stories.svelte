<script context="module" lang="ts">
  import { popups } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import LaterPopupComponent from '../../popups/later.svelte'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: LaterPopupComponent,
    title: 'Popups/Later'
  })

  // Scene re-renders children after filling the database
  const LOADING = popups.later('loading')
  const ERROR = popups.later('error')
</script>

<script lang="ts">
  import type { StoryContext } from 'storybook/internal/types'

  function addLink(url: string) {
    return async ({ canvas, userEvent }: StoryContext): Promise<void> => {
      let input = await canvas.findByRole('textbox', {}, { timeout: 5000 })
      await userEvent.type(input, `${url}{Enter}`)
    }
  }
</script>

<Story
  name="Loading"
  asChild
  parameters={{ layout: 'fullscreen' }}
  play={addLink('example.com/post')}
>
  <Scene responses={[['https://example.com/post', { loading: true }]]}>
    <LoadedPopup popup={LOADING}>
      {#snippet loaded(popup)}
        <LaterPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="Error"
  asChild
  parameters={{ layout: 'fullscreen' }}
  play={addLink('ftp://example.com/file')}
>
  <Scene>
    <LoadedPopup popup={ERROR}>
      {#snippet loaded(popup)}
        <LaterPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>
