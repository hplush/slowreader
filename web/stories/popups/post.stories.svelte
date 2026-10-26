<script lang="ts" module>
  import {
    type FeedValue,
    getPostPopupParam,
    openWarnings,
    type Popup,
    popups,
    type PostValue,
    showSensitiveMedia
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import PostPopupComponent from '../../popups/post.svelte'
  import imgExample from '../assets/long_width_example.avif'
  import emojiExample from '../assets/short_width_example.avif'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  const EMOJI =
    `<img class="emoji" src="${new URL(emojiExample, location.href).href}" ` +
    'alt=":blob:" title=":blob:">'

  const FEED = {
    id: 'feed',
    reading: 'slow',
    title: 'Example News',
    url: 'https://example.com/news.atom'
  } satisfies Partial<FeedValue>

  const POST = {
    feedId: 'feed',
    full:
      '<p>Example released a big update with <i>XSS</i> in the title.</p>' +
      '<p>The second paragraph to check how the popup renders long text ' +
      'with a few blocks and how the reading column is limited.</p>',
    intro: 'Example released a big update.',
    publishedAt: 1600000000,
    read: true,
    reading: 'slow',
    title: 'A big changes for Example',
    url: 'https://example.com/news/1'
  } satisfies Partial<PostValue>

  const MASTODON = {
    author: {
      avatar: imgExample,
      title: 'Jane Doe',
      url: 'https://mastodon.social/@jane'
    },
    feedId: 'mastodon',
    full:
      `<p>${EMOJI} Reposted post with all Mastodon features, ` +
      'which Slow Reader supports.</p>',
    media: [
      {
        alt: 'Sensitive image',
        sensitive: true,
        type: 'image',
        url: imgExample
      }
    ],
    mediaSizes: [{ height: 480, width: 1920 }],
    preview: {
      description: 'Description of the link',
      image: imgExample,
      title: 'Link title',
      url: 'https://example.com/article'
    },
    publishedAt: 1600000000,
    quoted: {
      author: {
        avatar: imgExample,
        title: 'Quoted Author',
        url: 'https://mastodon.social/@q'
      },
      full: '<p>Quoted post</p>',
      media: [
        {
          alt: 'Video',
          poster: imgExample,
          type: 'video',
          url: 'https://example.com/video.mp4'
        }
      ],
      missing: false,
      poll: { options: [{ title: 'Yes' }, { title: `No ${EMOJI}` }] },
      quotedUrl: 'https://mastodon.social/@other/2',
      url: 'https://mastodon.social/@q/1'
    },
    reading: 'slow',
    replied: {
      author: { title: 'Bob', url: 'https://mastodon.social/@bob' },
      full: '<p>The question, which the reposted post answers</p>',
      missing: false,
      url: 'https://mastodon.social/@bob/1'
    },
    repostedBy: { title: 'Mastodon' },
    unsupported: true,
    url: 'https://mastodon.social/@jane/1'
  } satisfies Partial<PostValue>

  const THREAD = [0, 45, 3 * 3600, 2 * 86400].map((delay, index) => {
    return {
      feedId: 'mastodon',
      full: `<p>The post number ${index + 1} of the thread</p>`,
      merged: index > 0,
      originId: `thread-${index + 1}`,
      publishedAt: 1600000000 + delay,
      reading: 'slow',
      threadId: 'thread-1',
      url: `https://mastodon.social/@Mastodon/${index + 1}`
    } satisfies Partial<PostValue>
  })

  const QUOTED_STATUS = {
    account: {
      avatar: new URL(imgExample, location.href).href,
      display_name: 'Quoted Author',
      id: 'q',
      url: 'https://mastodon.social/@q',
      username: 'q'
    },
    card: null,
    content: '<p>Quoted post</p>',
    created_at: '2020-09-13T12:26:40.000Z',
    edited_at: null,
    id: '1',
    media_attachments: [],
    poll: null,
    quote: {
      quoted_status: {
        account: {
          avatar: '',
          display_name: 'Other',
          id: 'other',
          url: 'https://mastodon.social/@other',
          username: 'other'
        },
        card: null,
        content: '<p>Post inside the quote</p>',
        created_at: '2020-09-13T12:26:40.000Z',
        edited_at: null,
        id: '2',
        media_attachments: [],
        poll: null,
        reblog: null,
        sensitive: false,
        spoiler_text: '',
        uri: 'https://mastodon.social/users/other/statuses/2',
        url: 'https://mastodon.social/@other/2'
      },
      state: 'accepted'
    },
    reblog: null,
    sensitive: false,
    spoiler_text: '',
    uri: 'https://mastodon.social/users/q/statuses/1',
    url: 'https://mastodon.social/@q/1'
  }

  const MASTODON_FEED = {
    id: 'mastodon',
    loader: 'mastodon',
    reading: 'slow',
    title: 'Mastodon',
    url: 'https://mastodon.social/@Mastodon'
  } satisfies Partial<FeedValue>

  const ORIGIN = getPostPopupParam({
    full: '<p>The post from the feed, which was not added yet.</p>',
    id: 'origin',
    originId: 'origin',
    publishedAt: 1600000000,
    title: 'Post from the feed preview',
    url: 'https://example.com/news/2'
  })

  let { Story } = defineMeta({
    component: PostPopupComponent,
    title: 'Popups/Post'
  })
</script>

<script lang="ts">
  let popup: Popup<'post'> | undefined = $state()

  function open(autoread = false, feedId = 'feed'): () => void {
    return () => {
      popup = popups.post(getPostPopupParam({ feedId, id: 'post-1' }, autoread))
    }
  }
</script>

<Story name="Read" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[FEED]} oninit={open(true)} posts={[POST]}>
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story name="Origin" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <LoadedPopup popup={popups.post(ORIGIN)}>
      {#snippet loaded(loadedPopup)}
        <PostPopupComponent popup={loadedPopup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Quote" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      popup = popups.post(MASTODON.quoted.url)
    }}
    responses={[
      [
        'https://mastodon.social/api/v1/statuses/1',
        {
          body: JSON.stringify(QUOTED_STATUS),
          contentType: 'application/json'
        }
      ]
    ]}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[FEED]}
    oninit={open()}
    posts={[{ ...POST, media: [{ type: 'image', url: imgExample }] }]}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story name="Mastodon" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[MASTODON_FEED]}
    oninit={open(false, 'mastodon')}
    posts={[MASTODON]}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story name="Broken Images" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[FEED]}
    oninit={open()}
    posts={[
      {
        author: {
          avatar: 'https://example.invalid/avatar.png',
          title: 'Jane Doe'
        },
        feedId: 'feed',
        full:
          '<p>Images failed to load</p>' +
          '<img src="https://example.invalid/text.png" alt="">',
        media: [
          { type: 'image', url: 'https://example.invalid/image.png' },
          { type: 'image', url: 'https://example.invalid/unsized.png' }
        ],
        mediaSizes: [{ height: 480, width: 1920 }],
        preview: {
          image: 'https://example.invalid/preview.png',
          title: 'Link title',
          url: 'https://example.com/article'
        },
        reading: 'slow',
        url: 'https://example.com/news/3'
      }
    ]}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story name="Thread" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[MASTODON_FEED]}
    oninit={open(false, 'mastodon')}
    posts={THREAD}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story name="Mastodon Warning" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[MASTODON_FEED]}
    oninit={open(false, 'mastodon')}
    posts={[
      {
        feedId: 'mastodon',
        full: '<p>Hidden text</p>',
        quoted: { missing: true },
        reading: 'slow',
        url: 'https://mastodon.social/@Mastodon/2',
        warning: `Movie spoilers ${EMOJI}`
      }
    ]}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story
  name="Mastodon Opened Sensitive"
  asChild
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[MASTODON_FEED]}
    oninit={() => {
      openWarnings.set(true)
      showSensitiveMedia.set(true)
      open(false, 'mastodon')()
    }}
    posts={[
      {
        feedId: 'mastodon',
        full: '<p>Hidden text</p>',
        media: [
          {
            alt: 'Sensitive image',
            sensitive: true,
            type: 'image',
            url: imgExample
          }
        ],
        reading: 'slow',
        url: 'https://mastodon.social/@Mastodon/2',
        warning: `Movie spoilers ${EMOJI}`
      }
    ]}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>
