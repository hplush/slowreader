<script context="module" lang="ts">
  import { popups } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FeedPopupComponent from '../../popups/feed.svelte'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: FeedPopupComponent,
    title: 'Popups/Feed'
  })

  const ICON =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
        '<rect width="16" height="16" fill="#0060df"/></svg>'
    )

  const ATOM = {
    body: `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Example News</title>
      <icon>${ICON}</icon>
      <updated>2021-01-01T00:00:00Z</updated>
      <id>https://example.com/news.atom</id>
      <entry>
        <title>A big changes for Example with <i>XSS</i></title>
        <link href="https://example.com/news/1" />
        <id>https://example.com/news/1</id>
        <updated>2021-01-01T00:00:00Z</updated>
      </entry>
      <entry>
        <title>Other news</title>
        <link href="https://example.com/news/2" />
        <id>https://example.com/news/2</id>
        <updated>2021-01-01T00:00:00Z</updated>
      </entry>
    </feed>`,
    contentType: 'application/atom+xml'
  }

  const MASTODON_API = 'https://mastodon.social/api/v1/accounts'

  const STATUSES = [1, 2, 3].map(id => ({
    account: {
      avatar: '',
      display_name: 'Jane',
      id: 'jane',
      url: 'https://mastodon.social/@jane',
      username: 'jane'
    },
    card: null,
    content: `<p>Post number ${id}</p>`,
    created_at: `2021-01-0${4 - id}T00:00:00.000Z`,
    edited_at: null,
    id: `${id}`,
    in_reply_to_account_id: null,
    in_reply_to_id: null,
    media_attachments: [],
    poll: null,
    reblog: null,
    sensitive: false,
    spoiler_text: '',
    uri: `https://mastodon.social/users/jane/statuses/${id}`,
    url: `https://mastodon.social/@jane/${id}`
  }))
</script>

<Story name="New" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={[
      ['https://example.com/news.atom', ATOM],
      [ICON, { contentType: 'image/svg+xml' }]
    ]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="New Closed" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={[
      [
        'https://fedi.example.com/@jane',
        '<!DOCTYPE html><html><head>' +
          '<meta content="Jane (@jane@example.com)" property="og:title">' +
          '<meta content="https://fedi.example.com/@jane" property="og:url">' +
          '<link href="/users/jane" rel="alternate" ' +
          'type="application/activity+json">' +
          '</head></html>'
      ],
      [
        'https://fedi.example.com/api/v1/accounts/lookup?acct=jane',
        {
          body: '{"error":"Unauthorized: token not supplied"}',
          contentType: 'application/json',
          status: 401
        }
      ]
    ]}
  >
    <LoadedPopup popup={popups.feed('https://fedi.example.com/@jane')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Added" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      {
        avatar: ICON,
        url: 'https://example.com/news.atom'
      }
    ]}
    responses={[['https://example.com/news.atom', ATOM]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Added Loading" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ url: 'https://example.com/news.atom' }]}
    responses={[['https://example.com/news.atom', { loading: true }]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Added Loading More" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ loader: 'mastodon', url: 'https://mastodon.social/@jane' }]}
    responses={[
      [
        'https://mastodon.social/@jane',
        '<!DOCTYPE html><html><head>' +
          '<meta content="Jane (@jane@mastodon.social)" property="og:title">' +
          '</head></html>'
      ],
      [
        `${MASTODON_API}/lookup?acct=jane`,
        {
          body: JSON.stringify(STATUSES[0]!.account),
          contentType: 'application/json'
        }
      ],
      [
        `${MASTODON_API}/jane/statuses?exclude_replies=true`,
        { body: JSON.stringify(STATUSES), contentType: 'application/json' }
      ],
      [
        `${MASTODON_API}/jane/statuses?exclude_replies=true&max_id=3`,
        { loading: true }
      ]
    ]}
  >
    <LoadedPopup popup={popups.feed('https://mastodon.social/@jane')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
        {#await popup.posts.loading.then(popup.posts.next)}{/await}
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Added Fast" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      {
        avatar:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mPQmmtPEmIY1TCqYfhqAAA1jwYQh1fDuAAAAABJRU5ErkJggg==',
        reading: 'fast',
        url: 'https://example.com/news.atom'
      }
    ]}
    responses={[['https://example.com/news.atom', ATOM]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="New Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene responses={[['https://example.com/news.atom', ATOM]]}>
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="Added Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[{ reading: 'fast', url: 'https://example.com/news.atom' }]}
    responses={[['https://example.com/news.atom', ATOM]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>
