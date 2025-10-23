<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import AddPage from '../../pages/add.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: AddPage,
    title: 'Pages/Add'
  })

  const HTML_WITH_LINKS = `
      <html>
        <head>
          <title>Example</title>
          <link rel="alternate" type="application/atom+xml"
            href="https://example.com/news.atom" />
          <link rel="alternate" type="application/rss+xml"
            href="https://example.com/comments.rss" />
          <link rel="alternate" type="application/rss+xml"
            href="https://example.com/long.atom" />
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
        <id>https://example.com/news.atom</id>
        <entry>
          <title>A big changes for Example with <i>XSS</i></title>
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
          <title>Feed with &lt;i&gt;<b>XSS</b>&lt;/i&gt;</title>
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
  const LONG_ATOM = {
    body: `<?xml version="1.0" encoding="utf-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>PneumonoultramicroscopicsilicovolcanoconiosisPneumonoultramicroscopicsilicovolcanoconiosis</title>
        <updated>2021-01-01T00:00:00Z</updated>
        <id>https://example.com/long.atom</id>
        <entry>
          <title>A big changes for Example with <i>XSS</i></title>
          <link href="https://example.com/long/1" />
          <id>https://example.com/long/1</id>
          <updated>2021-01-01T00:00:00Z</updated>
        </entry>
      </feed>`,
    contentType: 'application/atom+xml'
  }
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="add">
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story name="Searching" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={{ 'https://example.com': { loading: true } }}
    route={{
      params: { candidate: undefined, url: 'https://example.com' },
      route: 'add'
    }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story name="URL Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    route={{ params: { candidate: undefined, url: 'not a URL' }, route: 'add' }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story name="Loading Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={{ 'https://example.com': { status: 404 } }}
    route={{
      params: { candidate: undefined, url: 'https://example.com' },
      route: 'add'
    }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story name="No Feeds" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={{ '*': { status: 404 }, 'https://example.com': '<html></html>' }}
    route={{
      params: { candidate: undefined, url: 'https://example.com' },
      route: 'add'
    }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story name="Feeds" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={{
      'https://example.com': HTML_WITH_LINKS,
      'https://example.com/comments.rss': RSS,
      'https://example.com/long.atom': LONG_ATOM,
      'https://example.com/news.atom': ATOM
    }}
    route={{
      hash: `#feedUrl=https://example.com/news.atom`,
      params: { candidate: undefined, url: 'https://example.com' },
      route: 'add'
    }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story name="Added" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ url: 'https://example.com/news.atom' }]}
    responses={{
      'https://example.com': HTML_WITH_LINK,
      'https://example.com/news.atom': ATOM
    }}
    route={{
      params: { candidate: undefined, url: 'https://example.com' },
      route: 'add'
    }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story
  name="Added Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[{ url: 'https://example.com/news.atom' }]}
    responses={{
      'https://example.com': HTML_WITH_LINK,
      'https://example.com/news.atom': ATOM
    }}
    route={{
      params: { candidate: undefined, url: 'https://example.com' },
      route: 'add'
    }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>

<Story
  name="Added Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    feeds={[{ url: 'https://example.com/news.atom' }]}
    responses={{
      'https://example.com': HTML_WITH_LINK,
      'https://example.com/news.atom': ATOM
    }}
    route={{
      params: { candidate: undefined, url: 'https://example.com' },
      route: 'add'
    }}
  >
    <AddPage page={pages.add()} />
  </Scene>
</Story>
