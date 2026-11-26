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

  const NOW = Math.round(Date.now() / 1000)

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

  const FREQUENT_ATOM = {
    body: `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Example Hourly</title>
      <id>https://example.com/hourly.atom</id>
      ${Array.from({ length: 12 }, (_, i) => {
        let date = new Date(Date.now() - i * 2 * 3600 * 1000).toISOString()
        return `<entry>
          <title>Hourly news ${i + 1}</title>
          <link href="https://example.com/hourly/${i + 1}" />
          <id>https://example.com/hourly/${i + 1}</id>
          <updated>${date}</updated>
        </entry>`
      }).join('')}
    </feed>`,
    contentType: 'application/atom+xml'
  }

  const QUIET_ATOM = {
    body: ATOM.body.replaceAll(
      '2021-01-01T00:00:00Z',
      new Date(Date.now() - 240 * 86400 * 1000).toISOString()
    ),
    contentType: 'application/atom+xml'
  }

  const ABANDONED_ATOM = {
    body: ATOM.body.replaceAll(
      '2021-01-01T00:00:00Z',
      new Date(Date.now() - 400 * 86400 * 1000).toISOString()
    ),
    contentType: 'application/atom+xml'
  }

  const MASTODON_API = 'https://mastodon.social/api/v1/accounts'

  const STATUSES = [1, 2, 3].map(id => ({
    account: {
      acct: 'jane',
      avatar: '',
      display_name: 'Jane',
      id: 'jane',
      url: 'https://mastodon.social/@jane',
      username: 'jane'
    },
    card: null,
    content: `<p>Post number ${id}</p>`,
    created_at: new Date(Date.now() - id * 86400 * 1000).toISOString(),
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

  const ACCOUNTS = [
    {
      handle: '@me@mastodon.social',
      id: 'account-me',
      title: 'Me',
      url: 'https://mastodon.social/@me'
    },
    {
      handle: '@work@mastodon.social',
      id: 'account-work',
      title: 'Work',
      url: 'https://mastodon.social/@work'
    }
  ]
</script>

<script lang="ts">
  import type { StoryContext } from 'storybook/internal/types'

  async function openLiked({ canvas, userEvent }: StoryContext): Promise<void> {
    await userEvent.click(await canvas.findByRole('tab', { name: 'Liked' }))
  }

  async function enableExtract({
    canvas,
    userEvent
  }: StoryContext): Promise<void> {
    await userEvent.click(
      await canvas.findByRole('checkbox', { name: /Download full posts/ })
    )
  }
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

<Story
  name="Added"
  asChild
  parameters={{ layout: 'fullscreen' }}
  play={enableExtract}
>
  <Scene
    categories={[
      { id: 'long', title: 'Very long category name for every news site' }
    ]}
    feeds={[
      {
        avatar: ICON,
        categoryId: 'long',
        id: 'news',
        url: 'https://example.com/news.atom'
      },
      { id: 'popular', url: 'https://example.com/popular.atom' }
    ]}
    reactions={[
      {
        at: 1600000000,
        feedId: 'news',
        id: 'old',
        type: 'like',
        url: 'https://example.com/news/2020/very-long-post-address-to-wrap'
      },
      {
        at: 1600000000,
        feedId: 'news',
        id: 'bad',
        type: 'dislike',
        url: 'https://example.com/news/1'
      },
      { at: NOW, feedId: 'news', id: 'liked1', type: 'like' },
      { at: NOW, feedId: 'news', id: 'liked2', type: 'like' },
      { at: NOW, feedId: 'news', id: 'disliked', type: 'dislike' },
      { at: NOW, feedId: 'news', id: 'opened1', type: 'open' },
      { at: NOW, feedId: 'news', id: 'opened2', type: 'link' },
      { at: NOW, feedId: 'news', id: 'opened3', type: 'share' }
    ]}
    responses={[
      ['https://example.com/news.atom', QUIET_ATOM],
      ['https://example.com/robots.txt', { status: 404 }]
    ]}
    seen={{ news: 24, popular: 40 }}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="Added Liked"
  asChild
  parameters={{ layout: 'fullscreen' }}
  play={openLiked}
>
  <Scene
    feeds={[
      { id: 'jane', loader: 'mastodon', url: 'https://mastodon.social/@jane' }
    ]}
    reactions={[
      {
        at: 1600000002,
        feedId: 'jane',
        id: 'liked1',
        type: 'like',
        url: 'https://mastodon.social/@jane/1'
      },
      {
        at: 1600000001,
        feedId: 'jane',
        id: 'liked2',
        type: 'like',
        url: 'https://mastodon.social/@jane/2'
      },
      {
        at: 1600000000,
        feedId: 'jane',
        id: 'deleted',
        type: 'like',
        url: 'https://mastodon.social/@jane/404'
      }
    ]}
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
        'https://mastodon.social/api/v1/statuses/1',
        { body: JSON.stringify(STATUSES[0]), contentType: 'application/json' }
      ],
      [
        'https://mastodon.social/api/v1/statuses/2',
        { body: JSON.stringify(STATUSES[1]), contentType: 'application/json' }
      ],
      ['https://mastodon.social/api/v1/statuses/404', { status: 404 }]
    ]}
  >
    <LoadedPopup popup={popups.feed('https://mastodon.social/@jane')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="Added Loading"
  asChild
  parameters={{ layout: 'fullscreen' }}
  play={enableExtract}
>
  <Scene
    feeds={[{ url: 'https://example.com/news.atom' }]}
    responses={[
      ['https://example.com/news.atom', { loading: true }],
      [
        'https://example.com/robots.txt',
        { body: 'User-agent: *\nDisallow: /\n', contentType: 'text/plain' }
      ]
    ]}
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
    accounts={ACCOUNTS}
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

<Story
  name="New Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene responses={[['https://example.com/news.atom', ABANDONED_ATOM]]}>
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
  play={enableExtract}
>
  <Scene
    feeds={[
      { id: 'hourly', reading: 'fast', url: 'https://example.com/hourly.atom' }
    ]}
    posts={[
      { feedId: 'hourly', url: 'https://example.com/hourly/1' },
      { feedId: 'hourly', url: 'https://example.com/hourly/2' }
    ]}
    responses={[
      ['https://example.com/hourly.atom', FREQUENT_ATOM],
      ['https://example.com/robots.txt', { status: 404 }],
      ['https://example.com/hourly/1', { status: 404 }],
      ['https://example.com/hourly/2', { loading: true }]
    ]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/hourly.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Virtual" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    accounts={ACCOUNTS}
    feeds={[
      {
        accountId: 'account-work',
        categoryId: null,
        loader: 'mastodon',
        reading: null,
        url: 'https://mastodon.social/@jane'
      }
    ]}
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
      ]
    ]}
  >
    <LoadedPopup popup={popups.feed('https://mastodon.social/@jane')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>
