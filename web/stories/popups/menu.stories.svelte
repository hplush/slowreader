<script context="module" lang="ts">
  import {
    type CategoryValue,
    type FeedValue,
    popups,
    type PostValue
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import MenuPopupComponent from '../../popups/menu.svelte'
  import Navbar from '../../ui/navbar/index.svelte'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: MenuPopupComponent,
    title: 'Popups/Menu'
  })

  const CATEGORIES = [
    { id: 'browsers', title: 'Browsers' },
    { id: 'socials', title: 'Social Medias' }
  ] satisfies Partial<CategoryValue>[]
  const FEEDS = [
    { categoryId: 'browsers', id: 'mozilla', title: 'The Mozilla Blog' },
    { categoryId: 'socials', id: 'mastadon', title: 'Mastodon Blog' },
    { categoryId: 'socials', id: 'bluesky', title: 'Bluesky' }
  ] satisfies Partial<FeedValue>[]
  const POSTS = [
    { feedId: 'mozilla', reading: 'slow', title: 'New Firefox Release' },
    { feedId: 'mastadon', reading: 'slow', title: 'Trunk & Tidbits' },
    { feedId: 'bluesky', reading: 'slow', title: 'Progress Update' }
  ] satisfies Partial<PostValue>[]
</script>

<!-- The navbar takes the menu’s colors, not the colors of the page below -->
<Story
  name="Mobile Fast"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    posts={POSTS}
    route={{ hash: 'menu=fast', params: {}, route: 'slow' }}
  >
    <Navbar />
    <LoadedPopup popup={popups.menu('fast')}>
      {#snippet loaded(popup)}
        <MenuPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="Tablet Other"
  asChild
  globals={{ viewport: { value: 'tablet' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    posts={POSTS}
    route={{ hash: 'menu=other', params: {}, route: 'add' }}
  >
    <Navbar />
    <LoadedPopup popup={popups.menu('other')}>
      {#snippet loaded(popup)}
        <MenuPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>
