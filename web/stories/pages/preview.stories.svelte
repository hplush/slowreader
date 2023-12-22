<script context="module" lang="ts">
  import PreviewPage from '../../pages/preview.svelte'

  export const meta = {
    component: PreviewPage,
    title: 'Pages/Preview'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../scene.svelte'

  const HTML_WITH_LINKS = `
    <html>
      <head>
        <title>Example</title>
        <link rel="alternate" type="application/atom+xml"
          href="https://example.com/news.atom" />
        <link rel="alternate" type="application/rss+xml"
          href="https://example.com/comments.rss" />
      </head>
      <body></body>
    </html>
  `
  const HTML_WITH_LINK = `
    <html>
      <head>
        <title>Example</title>
        <link rel="alternate" type="application/atom+xml"
          href="https://example.com/news.atom" />
      </head>
      <body></body>
    </html>
  `
  const ATOM = {
    body: `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Example News</title>
      <updated>2021-01-01T00:00:00Z</updated>
      <id>https://example.com/ews.atom</id>
      <entry>
        <title>A big changes for Example</title>
        <link href="https://example.com/news/1" />
        <id>https://example.com/news/1</id>
        <updated>2021-01-01T00:00:00Z</updated>
      </entry>
    </feed>`,
    contentType: 'application/atom+xml'
  }
  const RSS = {
    body: `<?xml version="1.0" encoding="utf-8"?>
    <rss version="2.0">
      <channel>
        <title>Example Comments</title>
        <link>https://example.com/comments.rss</link>
        <item>
          <title>Comment</title>
          <link>https://example.com/comments/1</link>
          <guid>https://example.com/comments/1</guid>
          <pubDate>Thu, 01 Jan 1970 00:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>`,
    contentType: 'application/rss+xml'
  }
</script>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <PreviewPage url="" />
  </Scene>
</Story>

<Story name="URL Loading" parameters={{ layout: 'fullscreen' }}>
  <Scene responses={{ 'https://example.com': { loading: true } }}>
    <PreviewPage url="https://example.com" />
  </Scene>
</Story>

<Story name="URL Error" parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <PreviewPage url="not a URL" />
  </Scene>
</Story>

<Story name="Loading Error" parameters={{ layout: 'fullscreen' }}>
  <Scene responses={{ 'https://example.com': { status: 404 } }}>
    <PreviewPage url="https://example.com" />
  </Scene>
</Story>

<Story name="No Feeds" parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={{ '*': { status: 404 }, 'https://example.com': '<html></html>' }}
  >
    <PreviewPage url="https://example.com" />
  </Scene>
</Story>

<Story name="Feed" parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={{
      'https://example.com': HTML_WITH_LINKS,
      'https://example.com/comments.rss': RSS,
      'https://example.com/news.atom': ATOM
    }}
  >
    <PreviewPage url="https://example.com" />
  </Scene>
</Story>

<Story name="Added" parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ url: 'https://example.com/news.atom' }]}
    responses={{
      'https://example.com': HTML_WITH_LINK,
      'https://example.com/news.atom': ATOM
    }}
  >
    <PreviewPage url="https://example.com" />
  </Scene>
</Story>
