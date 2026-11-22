<script context="module" lang="ts">
  import { GENERAL_CATEGORY, type Popup, popups } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import CategoryPopupComponent from '../../popups/category.svelte'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: CategoryPopupComponent,
    title: 'Popups/Category'
  })
</script>

<script lang="ts">
  let popup: Popup<'category'> | undefined = $state()
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={[
      {
        id: 'long',
        reader: 'list',
        title: 'Very long category name for every news site'
      }
    ]}
    oninit={() => {
      popup = popups.category('long')
    }}
    route="categories"
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <CategoryPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story
  name="General"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="categories">
    <LoadedPopup popup={popups.category(GENERAL_CATEGORY)}>
      {#snippet loaded(loadedPopup)}
        <CategoryPopupComponent popup={loadedPopup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>
