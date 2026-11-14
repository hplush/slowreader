<script lang="ts" module>
  import {
    type FeedValue,
    getPostPopupParam,
    loaders,
    openWarnings,
    type Popup,
    popups,
    type PostValue,
    saveDataMode,
    showSensitiveMedia
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import PostPopupComponent from '../../popups/post.svelte'
  import videoExample from '../assets/example.webm'
  import imgExample from '../assets/long_width_example.avif'
  import emojiExample from '../assets/short_width_example.avif'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  const EMOJI =
    `<img class="emoji" src="${new URL(emojiExample, location.href).href}" ` +
    'alt=":blob:" title=":blob:">'

  // 40×25 pixels, like the tiny preview, which Telegram puts into the post
  const TINY =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABsSFBcUERsXFhceHBs' +
    'gKEIrKCUlKFE6PTBCYFVlZF9VXVtqeJmBanGQc1tdhbWGkJ6jq62rZ4C8ybqmx5moq6T/2wBDA' +
    'RweHigjKE4rK06kbl1upKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKS' +
    'kpKSkpKSkpKT/wAARCAAZACgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFB' +
    'gcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRV' +
    'S0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1d' +
    'nd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19j' +
    'Z2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/' +
    '8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnL' +
    'RChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g' +
    'oOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uP' +
    'k5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwBHlVXP7uPZ2wc7vp/OpoDDN92HqM8Hp9apL' +
    'CYnJ2FgVwecD8P89qlRrsH/AFfB4HGR1pc8u5nyR7FqJFfrAB6EODSkQA48sA4zyf8APpVQho+' +
    'TKBzwN/rUYuFkRw5GRymT1P5cevWmpT7i5Ydiw08AUMIRgjPL474445/Cis6WV3ypb5dxO0dBR' +
    'Wicu5DS7GgdQjIUHewGcg4xinvfQMnG05HIbI5/AfT/APXWVRU8iK5mWryaK6ffjY2OW5JPYD8' +
    'qikjt0ztneT6R4H6moaKpIVxW2fwbvxoptFMR/9k='

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
      '<h2>What is new</h2>' +
      '<p>The second paragraph to check how the popup renders long text ' +
      'with a few blocks and how the reading column is limited.</p>' +
      '<h3>Breaking changes</h3>' +
      '<p>Headings must be smaller than the post title. Rename ' +
      '<code>createStore()</code> to <code>atom()</code>, replace ' +
      '<code>store.subscribe()</code> by <code>store.listen()</code>, and ' +
      'move <code>onMount()</code> calls into <code>effect()</code>.</p>',
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
    mediaSizes: [{ height: 441, width: 700 }],
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
          url: videoExample
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

  // Popup opens the first post, which is the repost of the thread’s middle
  const THREAD = [3, 1, 2, 4].map(number => {
    return {
      feedId: 'mastodon',
      full: `<p>The post number ${number} of the thread</p>`,
      merged: number !== 3,
      originId: `thread-${number}`,
      publishedAt: 1600000000 + [0, 45, 3 * 3600, 2 * 86400][number - 1]!,
      reading: 'slow',
      threadId: 'thread-1',
      url: `https://mastodon.social/@Mastodon/${number}`,
      ...(number === 3 ? { repostedBy: { title: 'Jane Doe' } } : {})
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
    avatar: imgExample,
    id: 'mastodon',
    loader: 'mastodon',
    reading: 'slow',
    title: 'Mastodon',
    url: 'https://mastodon.social/@Mastodon'
  } satisfies Partial<FeedValue>

  const ORIGIN = getPostPopupParam({
    loader: 'rss',
    origin: {
      full: '<p>The post from the feed, which was not added yet.</p>',
      id: 'origin',
      originId: 'origin',
      publishedAt: 1600000000,
      title: 'Post from the feed preview',
      url: 'https://example.com/news/2'
    }
  })

  let { Story } = defineMeta({
    component: PostPopupComponent,
    title: 'Popups/Post'
  })
</script>

<script lang="ts">
  import type { StoryContext } from 'storybook/internal/types'

  let popup: Popup<'post'> | undefined = $state()

  async function playLastVideo({
    canvas,
    userEvent
  }: StoryContext): Promise<void> {
    let buttons = await canvas.findAllByRole('button', { name: /^Play video/ })
    await userEvent.setup({}).click(buttons.at(-1)!)
  }

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

<Story
  name="Loader Media"
  asChild
  parameters={{ layout: 'fullscreen' }}
  play={playLastVideo}
>
  <Scene
    feeds={[{ ...FEED, avatar: 'telegram:5/avatar/a', loader: 'telegram' }]}
    oninit={() => {
      loaders.telegram.getMedia = url => {
        if (url.endsWith('/broken')) return Promise.reject(new Error('No file'))
        if (url.endsWith('/loading')) return new Promise(() => {})
        return fetch(url === 'telegram:5/3' ? videoExample : imgExample)
      }
      open()()
    }}
    posts={[
      {
        feedId: 'feed',
        full:
          '<p>Files are loaded by Telegram’s library, not by URL. ' +
          'The second image is broken. The third one is still loading ' +
          'and shows the loader over a blurred preview. The video is a ' +
          'whole file, so it waits for the click. The second video was ' +
          'clicked and shows the loader until the file is ready.</p>' +
          '<p>Images inside the text are loaded the same way: ' +
          'normal, still loading, and broken.</p>' +
          '<img src="telegram:5/6" alt="" width="700" height="441">' +
          '<img src="telegram:5/6/loading" alt="" width="700" height="441">' +
          '<img src="telegram:5/6/broken" alt="" width="700" height="441">',
        media: [
          { type: 'image', url: 'telegram:5/4' },
          { type: 'image', url: 'telegram:5/4/broken' },
          { placeholder: TINY, type: 'image', url: 'telegram:5/4/loading' },
          {
            placeholder: TINY,
            poster: 'telegram:5/3/poster',
            type: 'video',
            url: 'telegram:5/3'
          },
          {
            placeholder: TINY,
            poster: 'telegram:5/3/poster',
            type: 'video',
            url: 'telegram:5/3/loading'
          }
        ],
        mediaSizes: [
          { height: 441, width: 700 },
          { height: 1080, width: 1920 },
          { height: 441, width: 700 },
          { bytes: 28089, height: 1080, width: 1920 },
          { bytes: 28089, height: 1080, width: 1920 }
        ],
        preview: {
          image: 'telegram:5/5/preview',
          title: 'Link title',
          url: 'https://example.com/'
        },
        title: null,
        url: 'https://t.me/news/4'
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

<Story name="Protected" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ ...FEED, protected: true }]}
    oninit={() => {
      loaders.telegram.getMedia = url => {
        return fetch(url === 'telegram:5/3' ? videoExample : imgExample)
      }
      open()()
    }}
    posts={[
      {
        feedId: 'feed',
        full:
          '<p>The channel forbids copying. Text can not be selected ' +
          'or copied. Image and video have no menu to save them ' +
          'and can not be dragged out. The post is hidden on print.</p>',
        media: [
          { type: 'image', url: 'telegram:5/4' },
          {
            placeholder: TINY,
            poster: 'telegram:5/3/poster',
            type: 'video',
            url: 'telegram:5/3'
          }
        ],
        mediaSizes: [
          { height: 441, width: 700 },
          { bytes: 28089, height: 1080, width: 1920 }
        ],
        preview: {
          image: 'telegram:5/5/preview',
          title: 'Link title',
          url: 'https://example.com/'
        },
        title: null,
        url: 'https://t.me/news/4'
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

<Story name="Save Data" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[FEED]}
    oninit={() => {
      saveDataMode.set('on')
      open()()
    }}
    posts={[
      {
        feedId: 'feed',
        full:
          `<p>Images wait for the click ${EMOJI}</p>` +
          `<img src="${new URL(imgExample, location.href).href}" ` +
          'width="700" height="441" ' +
          'alt="Wide example image">',
        media: [
          {
            alt: 'Chart of the release',
            placeholder: TINY,
            type: 'image',
            url: imgExample
          },
          { type: 'image', url: emojiExample },
          {
            alt: 'Movie scene',
            placeholder: TINY,
            sensitive: true,
            type: 'image',
            url: `${imgExample}#sensitive`
          },
          {
            alt: 'Video',
            poster: imgExample,
            type: 'video',
            url: videoExample
          },
          {
            alt: 'GIF',
            poster: imgExample,
            type: 'video;mode=gif',
            url: 'https://example.com/gif.mp4'
          }
        ],
        mediaSizes: [
          { bytes: 37_716, height: 441, width: 700 },
          { height: 564, width: 400 },
          { height: 441, width: 700 },
          { height: 180, width: 320 },
          { height: 441, width: 700 }
        ],
        preview: {
          image: imgExample,
          title: 'Link title',
          url: 'https://example.com/article'
        },
        reading: 'slow',
        url: 'https://example.com/news/4'
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
        warning:
          'Movie spoilers for the whole trilogy, including the ending of ' +
          `the last part and the post-credits scene ${EMOJI}`
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
