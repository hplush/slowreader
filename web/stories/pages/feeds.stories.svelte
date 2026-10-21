<script context="module" lang="ts">
  import {
    changePost,
    type FeedsPage as FeedsPageStore,
    GENERAL_CATEGORY,
    pages,
    type PostValue
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FeedsPage from '../../pages/feeds/index.svelte'
  import Navbar from '../../ui/navbar/index.svelte'
  import imgExample from '../assets/long_width_example.avif'
  import emojiExample from '../assets/short_width_example.avif'
  import Scene from '../scene.svelte'

  const POSTS = [
    {
      feedId: 'feed',
      full: 'The long text',
      intro: 'Post',
      reading: 'slow',
      title: 'My next chapter with Mastodon'
    },
    {
      feedId: 'feed',
      media: [{ alt: 'Wide image', type: 'image', url: imgExample }],
      reading: 'slow'
    },
    {
      feedId: 'feed',
      full: `<img alt="Wide image" src="${new URL(imgExample, location.href).href}">`,
      intro: 'Image from text is visible, since card shows summary',
      media: [
        {
          alt: 'Wide image',
          fromText: true,
          type: 'image',
          url: imgExample
        }
      ],
      reading: 'slow',
      title: 'The Future is Ours to Build - Together'
    },
    {
      feedId: 'feed',
      full:
        '<p>Image is not repeated</p>' +
        `<img alt="Wide image" src="${new URL(imgExample, location.href).href}">`,
      intro: null,
      media: [
        {
          alt: 'Wide image',
          fromText: true,
          type: 'image',
          url: imgExample
        }
      ],
      reading: 'slow'
    },
    { feedId: 'feed', full: '', intro: '', reading: 'slow', title: '' },
    {
      feedId: 'feed',
      reading: 'slow',
      title:
        'Linux Patches Improve Intel Nested VM Memory Performance Up To ~2353x In Synthetic Test'
    },
    {
      feedId: 'feed',
      reading: 'slow',
      title: '&lt;tag&gt;'
    },
    {
      feedId: 'feed',
      full: 'Short',
      intro:
        'Pretty long intro which container few sentences. ' +
        'But sentences is small enough to be cut by them.',
      reading: 'slow'
    },
    {
      feedId: 'feed',
      full:
        'Very long body without sentences to be able to cut ' +
        'the text in the middle of them for better readability',
      intro: '',
      reading: 'slow'
    },
    {
      feedId: 'feed',
      intro:
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文' +
        '文本文本文本文本文本文本文本文本文本文本文本文本文本文本文本文',
      reading: 'slow'
    },
    {
      feedId: 'feed',
      full: '<p>Video with HLS stream and MP4 fallback</p>',
      intro: null,
      media: [
        {
          alt: 'Video',
          poster: imgExample,
          sources: [
            {
              type: 'application/vnd.apple.mpegurl',
              url: 'https://example.com/playlist.m3u8'
            }
          ],
          type: 'video',
          url: 'https://example.com/original.mp4'
        }
      ],
      reading: 'slow'
    }
  ] satisfies Partial<PostValue>[]

  const EMOJI =
    `<img class="emoji" src="${new URL(emojiExample, location.href).href}" ` +
    'alt=":blob:" title=":blob:">'

  const AUTHOR = {
    avatar: imgExample,
    title: 'Jane Doe',
    url: 'https://mastodon.social/@jane'
  }

  const LIST_THREAD = [1, 2].map(index => {
    return {
      feedId: 'feed',
      full: `<p>The post number ${index} of the thread</p>`,
      intro: null,
      merged: index > 1,
      originId: `thread-${index}`,
      publishedAt: 2000 + index,
      reading: 'slow',
      sortedAt: 2002,
      threadId: 'thread-1'
    } satisfies Partial<PostValue>
  })

  const MASTODON = [
    {
      accountId: 'account-me',
      author: {
        title: 'Alice',
        url: 'https://mastodon.social/@alice'
      },
      feedId: null,
      full: '<p>Repost from the home timeline of the account</p>',
      intro: null,
      originId: 'from-account',
      publishedAt: 10,
      reading: 'fast',
      repostedBy: { title: 'Bob', url: 'https://mastodon.social/@bob' }
    },
    {
      feedId: 'mastodon',
      full:
        '<p>The first post of the thread is long to be cut in the card.</p>' +
        '<p>' +
        'Its second paragraph does not fit into the card of the feed reader, '.repeat(
          10
        ) +
        '</p>',
      intro: null,
      originId: 'thread',
      publishedAt: 7,
      reading: 'fast',
      sortedAt: 9,
      threadId: 'thread'
    },
    {
      feedId: 'mastodon',
      full: '<p>The second post of the thread</p>',
      intro: null,
      merged: true,
      originId: 'thread-2',
      publishedAt: 8,
      reading: 'fast',
      threadId: 'thread'
    },
    {
      feedId: 'mastodon',
      full: '<p>The third post of the thread</p>',
      intro: null,
      merged: true,
      originId: 'thread-3',
      publishedAt: 9,
      reading: 'fast',
      threadId: 'thread'
    },
    {
      author: AUTHOR,
      feedId: 'mastodon',
      full: `<p>Reposted reply with a link card ${EMOJI}</p>`,
      intro: null,
      preview: {
        description: 'Description of the link from the page’s meta tags',
        image: imgExample,
        title: 'Link title',
        url: 'https://example.com/article'
      },
      publishedAt: 6,
      reading: 'fast',
      replied: {
        author: { title: 'Bob', url: 'https://mastodon.social/@bob' },
        full: '<p>The question, which the reposted post answers</p>',
        missing: false,
        url: 'https://mastodon.social/@bob/1'
      },
      repostedBy: { title: 'Mastodon' }
    },
    {
      feedId: 'mastodon',
      full: '<p>Spoiler of the movie</p>',
      intro: null,
      publishedAt: 5,
      reading: 'fast',
      warning: `Movie spoilers ${EMOJI}`
    },
    {
      feedId: 'mastodon',
      full: '<p>Photos and video with alt text</p>',
      intro: null,
      media: [
        { alt: 'Wide image', sensitive: true, type: 'image', url: imgExample },
        {
          alt: 'Video',
          poster: imgExample,
          sensitive: true,
          type: 'video',
          url: 'https://example.com/video.mp4'
        },
        {
          alt: 'GIF',
          poster: imgExample,
          sensitive: true,
          type: 'video;mode=gif',
          url: 'https://example.com/gif.mp4'
        }
      ],
      mediaSizes: [{ height: 480, width: 1920 }, null, null],
      publishedAt: 4,
      reading: 'fast'
    },
    {
      feedId: 'mastodon',
      full: '<p>Quoting other post</p>',
      intro: null,
      publishedAt: 3,
      quoted: {
        author: AUTHOR,
        full: '<p>Quoted post, which quotes another one</p>',
        media: [{ alt: 'Wide image', type: 'image', url: imgExample }],
        missing: false,
        quotedUrl: 'https://mastodon.social/@other/2',
        url: 'https://mastodon.social/@jane/1'
      },
      reading: 'fast'
    },
    {
      feedId: 'mastodon',
      full: '<p>Quoting deleted post with a poll</p>',
      intro: null,
      publishedAt: 2,
      quoted: { missing: true },
      reading: 'fast',
      unsupported: true
    }
  ] satisfies Partial<PostValue>[]

  /**
   * Readers load only unread posts, so the read style is visible only
   * for the posts, which the user read without leaving the page.
   */
  function readAfterLoading(page: FeedsPageStore, ids: string[]): void {
    let unbind = page.postsLoading.listen(loading => {
      if (!loading) {
        unbind()
        void changePost(ids, { read: true })
      }
    })
  }

  function multiply<Value>(array: Value[], count: number): Value[] {
    let result: Value[] = []
    for (let i = 0; i < count; i++) {
      result.push(...array)
    }
    return result
  }

  let { Story } = defineMeta({
    component: FeedsPage,
    title: 'Pages/Feeds'
  })
</script>

<Story name="Slow Welcome" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="slow">
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="Fast Welcome" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="fast">
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Slow Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{}]} route="slow">
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="Fast Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{}]} route="fast">
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Fast Category Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={[
      { id: 'read', title: 'Comics' },
      { id: 'unread', title: 'Photo' }
    ]}
    feeds={[
      { categoryId: 'read', id: 'comics', reading: 'fast', title: 'Comics' },
      { categoryId: 'unread', id: 'photo', reading: 'fast', title: 'Photo' }
    ]}
    posts={[{ feedId: 'photo', reading: 'fast' }]}
    route={{ params: { category: 'read' }, route: 'fast' }}
  >
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Loading" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow', title: 'The Mozilla Blog' }]}
    oninit={() => {
      setTimeout(() => {
        pages.slow().posts.get()?.loading.set(true)
      }, 100)
      setTimeout(() => {
        pages.slow().posts.get()?.loading.set(true)
      }, 500)
    }}
    posts={[{ feedId: 'feed', reading: 'slow' }]}
    route={{ params: { feed: 'feed' }, route: 'slow' }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow', title: 'The Mozilla Blog' }]}
    posts={[...LIST_THREAD, ...POSTS]}
    route={{ params: { feed: 'feed' }, route: 'slow' }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List All Read" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow', title: 'The Mozilla Blog' }]}
    oninit={() => readAfterLoading(pages.slow(), ['post-1', 'post-2'])}
    posts={POSTS.slice(0, 2)}
    route={{ params: { feed: 'feed' }, route: 'slow' }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List Read" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow', title: 'The Mozilla Blog' }]}
    oninit={() => readAfterLoading(pages.slow(), ['post-2', 'post-3'])}
    posts={POSTS}
    route={{ params: { feed: 'feed' }, route: 'slow' }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List Opened" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow', title: 'The Mozilla Blog' }]}
    posts={POSTS}
    route={{
      hash: 'post=read:post-1',
      params: { feed: 'feed' },
      route: 'slow'
    }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List Pagination" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      {
        avatar:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
              '<rect width="16" height="16" fill="#0060df"/></svg>'
          ),
        id: 'feed',
        reading: 'slow',
        title:
          'Very long feed title which does not fit into the header ' +
          'and must be cut with ellipsis to keep the reader switch in place'
      }
    ]}
    posts={multiply(POSTS, 50)}
    route={{
      params: { feed: 'feed' },
      route: 'slow'
    }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="Feed" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      {
        avatar:
          'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
              '<circle cx="8" cy="8" r="8" fill="#e66000"/></svg>'
          ),
        id: 'feed',
        reading: 'fast',
        title: 'The Mozilla Blog'
      }
    ]}
    posts={POSTS.map(i => ({ ...i, reading: 'fast' }))}
    route={{ params: { category: GENERAL_CATEGORY }, route: 'fast' }}
  >
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Feed Mastodon" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    accounts={[{ id: 'account-me' }]}
    feeds={[
      {
        id: 'mastodon',
        loader: 'mastodon',
        reading: 'fast',
        title: 'Mastodon',
        url: 'https://mastodon.social/@Mastodon'
      }
    ]}
    posts={MASTODON}
    route={{ params: { category: GENERAL_CATEGORY }, route: 'fast' }}
  >
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Feed Opened" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'fast', title: 'The Mozilla Blog' }]}
    posts={POSTS.map(i => ({ ...i, reading: 'fast' }))}
    route={{
      hash: 'post=id:post-1',
      params: { category: GENERAL_CATEGORY },
      route: 'fast'
    }}
  >
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Feed Pagination" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'fast', title: 'The Mozilla Blog' }]}
    posts={multiply(
      POSTS.map(i => ({ ...i, reading: 'fast' })),
      50
    )}
    route={{ params: { category: GENERAL_CATEGORY }, route: 'fast' }}
  >
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story
  name="Mobile Menu"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    categories={[
      { id: 'browsers', title: 'Browsers' },
      { id: 'socials', title: 'Social Medias' }
    ]}
    feeds={[
      { categoryId: 'browsers', id: 'mozilla', title: 'The Mozilla Blog' },
      { categoryId: 'socials', id: 'mastadon', title: 'Mastodon Blog' }
    ]}
    route="fast"
  >
    <FeedsPage page={pages.fast()} />
    <Navbar />
  </Scene>
</Story>

<Story
  name="Mobile Empty"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene feeds={[{}]} route="fast">
    <FeedsPage page={pages.fast()} />
    <Navbar />
  </Scene>
</Story>

<Story
  name="Mobile Feed"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[{ id: 'feed', reading: 'fast', title: 'The Mozilla Blog' }]}
    posts={POSTS.map(i => ({ ...i, reading: 'fast' }))}
    route={{ params: { category: GENERAL_CATEGORY }, route: 'fast' }}
  >
    <FeedsPage page={pages.fast()} />
    <Navbar />
  </Scene>
</Story>

<Story
  name="Mobile List"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow', title: 'The Mozilla Blog' }]}
    posts={POSTS}
    route={{ params: { feed: 'feed' }, route: 'slow' }}
  >
    <FeedsPage page={pages.slow()} />
    <Navbar />
  </Scene>
</Story>
