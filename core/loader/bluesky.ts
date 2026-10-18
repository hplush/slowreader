import { ParseError } from '../errors.ts'
import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { parseDocument } from '../lib/html.ts'
import type {
  MediaSize,
  ParsedPost,
  PostAuthor,
  PostMedia,
  PostPreview,
  QuotedPost
} from '../post.ts'
import { createPostsList, type PostsListResult } from '../posts-list.ts'
import {
  findDocumentLinks,
  findMetaProperty,
  isObject,
  type Loader,
  readLoaderData,
  toAvatarUrl,
  toTime
} from './common.ts'

// https://docs.bsky.app/docs/api/app-bsky-actor-get-profile
interface BlueskyProfile {
  avatar?: string
  did: string
  displayName?: string
  handle: string
}

interface BlueskyLabel {
  val: string
}

// https://docs.bsky.app/docs/advanced-guides/post-richtext
interface BlueskyFacet {
  features: { $type: string; did?: string; tag?: string; uri?: string }[]
  index: { byteEnd: number; byteStart: number }
}

interface BlueskyRecord {
  createdAt: string
  facets?: BlueskyFacet[]
  labels?: { values?: BlueskyLabel[] }
  reply?: { parent: { uri: string } }
  text: string
}

interface BlueskyImage {
  alt: string
  aspectRatio?: { height: number; width: number }
  fullsize: string
}

interface BlueskyExternal {
  description: string
  thumb?: string
  title: string
  uri: string
}

interface BlueskyQuoteRecord {
  $type: string
  author?: BlueskyProfile
  embeds?: BlueskyEmbed[]
  labels?: BlueskyLabel[]
  uri: string
  value?: BlueskyRecord
}

// https://docs.bsky.app/docs/advanced-guides/posts#embeds
type BlueskyEmbed =
  | {
      $type: 'app.bsky.embed.external#view'
      external: BlueskyExternal
    }
  | {
      $type: 'app.bsky.embed.images#view'
      images: BlueskyImage[]
    }
  | {
      $type: 'app.bsky.embed.record#view'
      record: BlueskyQuoteRecord
    }
  | {
      $type: 'app.bsky.embed.recordWithMedia#view'
      media: BlueskyEmbed
      record: { record: BlueskyQuoteRecord }
    }
  | {
      $type: 'app.bsky.embed.video#view'
      alt?: string
      aspectRatio?: { height: number; width: number }
      cid: string
      playlist: string
      presentation?: 'default' | 'gif'
      thumbnail?: string
    }

interface BlueskyPost {
  author: BlueskyProfile
  embed?: BlueskyEmbed
  labels?: BlueskyLabel[]
  record: BlueskyRecord
  uri: string
}

interface BlueskyReplyRef {
  $type: string
  author?: BlueskyProfile
  embed?: BlueskyEmbed
  labels?: BlueskyLabel[]
  record?: BlueskyRecord
  uri: string
}

// https://docs.bsky.app/docs/api/app-bsky-feed-get-author-feed
interface BlueskyFeedItem {
  post: BlueskyPost
  reason?: {
    $type: string
    by: BlueskyProfile
    indexedAt: string
  }
  reply?: { parent: BlueskyReplyRef }
}

interface BlueskyThread {
  $type: string
  parent?: BlueskyThread
  post?: BlueskyPost
}

type PdsFinder = (did: string) => Promise<string | undefined>

const API = 'https://public.api.bsky.app/xrpc'

const APP = 'https://bsky.app'

const PROFILE = /^\/profile\/([^/]+)\/?$/

const POST = /^\/profile\/([^/]+)\/post\/([^/]+)\/?$/

const HANDLE = /^@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/i

// https://docs.bsky.app/docs/advanced-guides/moderation#global-label-values
const SENSITIVE = new Set(['gore', 'graphic-media', 'nudity', 'porn', 'sexual'])

function parseProfile(response: TextResponse): BlueskyProfile {
  let profile = response.parseJson()
  if (!isObject(profile) || typeof profile.did !== 'string') {
    throw new ParseError('Bluesky profile has no DID', response.text)
  }
  return profile as unknown as BlueskyProfile
}

function parseFeed(response: TextResponse): {
  cursor?: string
  feed: BlueskyFeedItem[]
} {
  let data = response.parseJson()
  if (
    !isObject(data) ||
    !Array.isArray(data.feed) ||
    !data.feed.every(item => isObject(item) && isObject(item.post))
  ) {
    throw new ParseError('Bluesky feed is not an array', response.text)
  }
  return data as unknown as { cursor?: string; feed: BlueskyFeedItem[] }
}

function parseThread(response: TextResponse): BlueskyThread {
  let data = response.parseJson()
  if (!isObject(data) || !isObject(data.thread)) {
    throw new ParseError('Bluesky thread is missing', response.text)
  }
  return data.thread as unknown as BlueskyThread
}

function getActor(url: string): string {
  return decodeURIComponent(new URL(url).pathname.match(PROFILE)![1]!)
}

function isProfile(url: string): boolean {
  let parsed = new URL(url)
  return parsed.hostname === 'bsky.app' && PROFILE.test(parsed.pathname)
}

/**
 * Handle is broken, when its domain stops to point to the account
 */
function toProfileUrl(profile: BlueskyProfile): string {
  let name = profile.handle === 'handle.invalid' ? profile.did : profile.handle
  return `${APP}/profile/${name}`
}

function toPostUrl(author: BlueskyProfile, uri: string): string {
  return `${toProfileUrl(author)}/post/${uri.split('/').at(-1)}`
}

function getDid(uri: string): string {
  return uri.split('/')[2]!
}

function toAuthor(profile: BlueskyProfile): PostAuthor {
  let author: PostAuthor = {
    title: profile.displayName?.trim() || profile.handle,
    url: toProfileUrl(profile)
  }
  if (profile.avatar) author.avatar = profile.avatar
  return author
}

function getFacetLink(facet: BlueskyFacet): string | undefined {
  for (let feature of facet.features) {
    if (feature.$type === 'app.bsky.richtext.facet#link') return feature.uri
    if (feature.$type === 'app.bsky.richtext.facet#mention') {
      return `${APP}/profile/${feature.did}`
    }
    if (feature.$type === 'app.bsky.richtext.facet#tag') {
      return `${APP}/hashtag/${encodeURIComponent(feature.tag!)}`
    }
  }
  return undefined
}

/**
 * Empty line starts a new paragraph, like Mastodon’s HTML
 */
function appendText(paragraphs: HTMLElement[], text: string): void {
  text.split(/\n{2,}/).forEach((part, index) => {
    if (index > 0) {
      paragraphs.push(paragraphs[0]!.ownerDocument.createElement('p'))
    }
    let paragraph = paragraphs.at(-1)!
    part.split('\n').forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        paragraph.append(paragraph.ownerDocument.createElement('br'))
      }
      if (line) paragraph.append(line)
    })
  })
}

/**
 * Facets point to UTF-8 bytes, not to JS chars
 */
function textToHtml(record: BlueskyRecord): string {
  let document = parseDocument('')
  let paragraphs = [document.createElement('p')]
  let bytes = new TextEncoder().encode(record.text)
  let decoder = new TextDecoder()
  let position = 0
  let facets = (record.facets ?? []).toSorted(
    (a, b) => a.index.byteStart - b.index.byteStart
  )
  for (let facet of facets) {
    let { byteEnd, byteStart } = facet.index
    let href = getFacetLink(facet)
    if (!href || byteStart < position || byteEnd > bytes.length) continue
    appendText(paragraphs, decoder.decode(bytes.slice(position, byteStart)))
    let link = document.createElement('a')
    link.href = href
    link.textContent = decoder.decode(bytes.slice(byteStart, byteEnd))
    paragraphs.at(-1)!.append(link)
    position = byteEnd
  }
  appendText(paragraphs, decoder.decode(bytes.slice(position)))
  return paragraphs
    .filter(paragraph => paragraph.childNodes.length > 0)
    .map(paragraph => paragraph.outerHTML)
    .join('')
}

function isSensitive(
  labels: BlueskyLabel[] | undefined,
  record: BlueskyRecord
): boolean {
  return [...(labels ?? []), ...(record.labels?.values ?? [])].some(label =>
    SENSITIVE.has(label.val)
  )
}

/**
 * Bluesky shows GIFs from Tenor as videos by its own proxy,
 * since GIF files are heavy.
 */
function toGif(external: BlueskyExternal): PostMedia | undefined {
  let url = new URL(external.uri)
  if (url.hostname !== 'media.tenor.com') return undefined
  let [, id, file] = url.pathname.split('/')
  if (!id || !file?.endsWith('.gif')) return undefined
  let gif: PostMedia = {
    type: 'video;mode=gif',
    url:
      `https://t.gifs.bsky.app/${id.replace(/AAAAC$/, 'AAAP1')}/` +
      file.replace(/\.gif$/, '.mp4')
  }
  let alt = external.description.replace(/^Alt: /, '') || external.title
  if (alt) gif.alt = alt
  if (external.thumb) gif.poster = external.thumb
  return gif
}

function getGifSize(external: BlueskyExternal): MediaSize | null {
  let url = new URL(external.uri)
  let height = Number(url.searchParams.get('hh'))
  let width = Number(url.searchParams.get('ww'))
  return height && width ? { height, width } : null
}

function toApproximateSize(
  ratio: undefined | { height: number; width: number }
): MediaSize | null {
  if (!ratio) return null
  return { approximate: true, height: ratio.height, width: ratio.width }
}

async function loadPds(
  task: DownloadTask,
  did: string
): Promise<string | undefined> {
  let url = did.startsWith('did:web:')
    ? `https://${did.slice(8)}/.well-known/did.json`
    : `https://plc.directory/${did}`
  try {
    let document = (await task.text(url)).parseJson()
    if (isObject(document) && Array.isArray(document.service)) {
      let pds: unknown = document.service.find(
        service =>
          isObject(service) && String(service.id).endsWith('#atproto_pds')
      )
      if (isObject(pds) && typeof pds.serviceEndpoint === 'string') {
        return pds.serviceEndpoint
      }
    }
  } catch {
    // Video will still have HLS stream
  }
  return undefined
}

function createPdsFinder(task: DownloadTask): PdsFinder {
  let cache = new Map<string, Promise<string | undefined>>()
  return did => {
    if (!cache.has(did)) cache.set(did, loadPds(task, did))
    return cache.get(did)!
  }
}

/**
 * Only Safari plays HLS, while original MP4 from the author’s server
 * has no seeking in Safari.
 */
async function parseVideo(
  embed: Extract<BlueskyEmbed, { $type: 'app.bsky.embed.video#view' }>,
  did: string,
  findPds: PdsFinder
): Promise<PostMedia> {
  let item: PostMedia = {
    type: embed.presentation === 'gif' ? 'video;mode=gif' : 'video',
    url: embed.playlist
  }
  let pds = await findPds(did)
  if (pds) {
    item.sources = [
      { type: 'application/vnd.apple.mpegurl', url: embed.playlist }
    ]
    item.url = new URL(
      '/xrpc/com.atproto.sync.getBlob' +
        `?did=${encodeURIComponent(did)}&cid=${embed.cid}`,
      pds
    ).href
  }
  if (embed.alt) item.alt = embed.alt
  if (embed.thumbnail) item.poster = embed.thumbnail
  return item
}

async function parseMedia(
  embed: BlueskyEmbed | undefined,
  sensitive: boolean,
  did: string,
  findPds: PdsFinder
): Promise<Pick<ParsedPost, 'media' | 'mediaSizes' | 'preview'>> {
  if (embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
    return parseMedia(embed.media, sensitive, did, findPds)
  }
  let media: PostMedia[] = []
  let sizes: (MediaSize | null)[] = []
  if (embed?.$type === 'app.bsky.embed.images#view') {
    for (let image of embed.images) {
      let item: PostMedia = { type: 'image', url: image.fullsize }
      if (image.alt) item.alt = image.alt
      media.push(item)
      sizes.push(toApproximateSize(image.aspectRatio))
    }
  } else if (embed?.$type === 'app.bsky.embed.video#view') {
    media.push(await parseVideo(embed, did, findPds))
    sizes.push(toApproximateSize(embed.aspectRatio))
  } else if (embed?.$type === 'app.bsky.embed.external#view') {
    let gif = toGif(embed.external)
    if (gif) {
      media.push(gif)
      sizes.push(getGifSize(embed.external))
    } else {
      let preview: PostPreview = { url: embed.external.uri }
      if (embed.external.title) preview.title = embed.external.title
      if (embed.external.description) {
        preview.description = embed.external.description
      }
      if (embed.external.thumb) preview.image = embed.external.thumb
      return { preview }
    }
  }
  if (media.length === 0) return {}
  if (sensitive) {
    for (let item of media) item.sensitive = true
  }
  if (sizes.every(size => size === null)) return { media }
  return { media, mediaSizes: sizes }
}

function getQuoteRecord(
  embed: BlueskyEmbed | undefined
): BlueskyQuoteRecord | undefined {
  if (embed?.$type === 'app.bsky.embed.record#view') return embed.record
  if (embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
    return embed.record.record
  }
  return undefined
}

async function parseContent(
  author: BlueskyProfile,
  uri: string,
  record: BlueskyRecord,
  embed: BlueskyEmbed | undefined,
  labels: BlueskyLabel[] | undefined,
  findPds: PdsFinder
): Promise<Omit<ParsedPost, 'originId'>> {
  let post: Omit<ParsedPost, 'originId'> = {
    publishedAt: toTime(record.createdAt),
    url: toPostUrl(author, uri),
    ...(await parseMedia(
      embed,
      isSensitive(labels, record),
      author.did,
      findPds
    ))
  }
  let full = textToHtml(record)
  if (full) post.full = full
  return post
}

async function toQuoted(
  author: BlueskyProfile,
  uri: string,
  record: BlueskyRecord,
  embed: BlueskyEmbed | undefined,
  labels: BlueskyLabel[] | undefined,
  findPds: PdsFinder
): Promise<QuotedPost> {
  let quoted: QuotedPost = {
    ...(await parseContent(author, uri, record, embed, labels, findPds)),
    author: toAuthor(author),
    missing: false
  }
  let deeper = getQuoteRecord(embed)
  if (deeper?.author) quoted.quotedUrl = toPostUrl(deeper.author, deeper.uri)
  return quoted
}

/**
 * Quote can be a feed, a list, or a starter pack, which we do not show
 */
async function parseQuote(
  record: BlueskyQuoteRecord,
  findPds: PdsFinder
): Promise<QuotedPost | undefined> {
  if (record.$type === 'app.bsky.embed.record#viewRecord') {
    return toQuoted(
      record.author!,
      record.uri,
      record.value!,
      record.embeds?.[0],
      record.labels,
      findPds
    )
  }
  if (
    record.$type === 'app.bsky.embed.record#viewNotFound' ||
    record.$type === 'app.bsky.embed.record#viewBlocked' ||
    record.$type === 'app.bsky.embed.record#viewDetached'
  ) {
    return { missing: true }
  }
  return undefined
}

async function parsePost(
  post: BlueskyPost,
  findPds: PdsFinder
): Promise<ParsedPost> {
  let parsed: ParsedPost = {
    ...(await parseContent(
      post.author,
      post.uri,
      post.record,
      post.embed,
      post.labels,
      findPds
    )),
    originId: post.uri
  }
  let quote = getQuoteRecord(post.embed)
  if (quote) {
    let quoted = await parseQuote(quote, findPds)
    if (quoted) {
      parsed.quoted = quoted
    } else {
      parsed.unsupported = true
    }
  }
  let parent = post.record.reply?.parent.uri
  if (parent && getDid(parent) === post.author.did) {
    parsed.selfReplyTo = parent
  }
  return parsed
}

async function parseReplied(
  parent: BlueskyReplyRef,
  findPds: PdsFinder
): Promise<QuotedPost> {
  if (parent.$type !== 'app.bsky.feed.defs#postView') return { missing: true }
  return toQuoted(
    parent.author!,
    parent.uri,
    parent.record!,
    parent.embed,
    parent.labels,
    findPds
  )
}

async function parseItem(
  item: BlueskyFeedItem,
  findPds: PdsFinder
): Promise<ParsedPost> {
  // Post’s ID instead of repost’s ID keeps one copy after the second repost
  let post = await parsePost(item.post, findPds)
  if (item.reason?.$type === 'app.bsky.feed.defs#reasonRepost') {
    post.author = toAuthor(item.post.author)
    post.repostedBy = toAuthor(item.reason.by)
    post.publishedAt = toTime(item.reason.indexedAt)
    delete post.selfReplyTo
    if (item.reply) {
      post.replied = await parseReplied(item.reply.parent, findPds)
    }
  }
  return post
}

async function loadProfile(
  task: DownloadTask,
  actor: string
): Promise<BlueskyProfile> {
  return parseProfile(
    await task.text(
      `${API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`
    )
  )
}

async function loadThread(
  task: DownloadTask,
  uri: string,
  parentHeight: number
): Promise<BlueskyThread> {
  return parseThread(
    await task.text(
      `${API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}` +
        `&depth=0&parentHeight=${parentHeight}`
    )
  )
}

async function loadPage(
  task: DownloadTask,
  findPds: PdsFinder,
  actor: string,
  cursor?: string
): Promise<PostsListResult> {
  let page = parseFeed(
    await task.text(
      `${API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}` +
        '&filter=posts_and_author_threads' +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '')
    )
  )
  let next = page.cursor
  return [
    await Promise.all(page.feed.map(item => parseItem(item, findPds))),
    next && page.feed.length > 0
      ? () => loadPage(task, findPds, actor, next)
      : undefined
  ]
}

export const bluesky: Loader = {
  async getAvatar(text, task, url) {
    return toAvatarUrl((await loadProfile(task, getActor(url))).avatar, url)
  },

  getMineLinksFromText(text) {
    let url = new URL(text.url)
    let post = url.pathname.match(POST)
    if (url.hostname !== 'bsky.app' || !post) return []
    return [`${APP}/profile/${post[1]}`]
  },

  async getLoaderData(task, url) {
    return JSON.stringify({ did: (await loadProfile(task, getActor(url))).did })
  },

  getPosts(task, url, text, refreshedAt, loaderData) {
    return createPostsList(() =>
      loadPage(
        task,
        createPdsFinder(task),
        readLoaderData(loaderData, 'did') ?? getActor(url)
      )
    )
  },

  async getPostByUrl(task, url) {
    let [, actor, rkey] = new URL(url).pathname.match(POST)!
    let thread = await loadThread(
      task,
      `at://${decodeURIComponent(actor!)}/app.bsky.feed.post/${rkey}`,
      0
    )
    if (!thread.post) {
      throw new ParseError('Bluesky post is missing', JSON.stringify(thread))
    }
    return {
      author: toAuthor(thread.post.author),
      ...(await parsePost(thread.post, createPdsFinder(task))),
      id: url
    }
  },

  getProfilesByHandle(task, handle) {
    let match = handle.match(HANDLE)
    return Promise.resolve(
      match ? [`${APP}/profile/${match[1]!.toLowerCase()}`] : []
    )
  },

  async getPostSource(feed, originId) {
    let thread = await loadThread(createDownloadTask(), originId, 0)
    return thread.post
  },

  async getThreadAncestors(task, feedUrl, originId) {
    let thread = await loadThread(task, originId, 1000)
    let author = getDid(originId)
    let chain: BlueskyPost[] = []
    let current = thread.parent
    while (current?.post && current.post.author.did === author) {
      chain.unshift(current.post)
      current = current.parent
    }
    // Thread starts with a reply to others or to deleted post
    if (current) return []
    let findPds = createPdsFinder(task)
    return Promise.all(chain.map(post => parsePost(post, findPds)))
  },

  getSuggestedLinksFromText() {
    return []
  },

  getSupersededLinksFromText(text) {
    return findDocumentLinks(text, 'application/rss+xml')
  },

  async detectFeed(text, task, url) {
    if (!isProfile(url)) return false
    // Redirect page could have meta of something else
    let title = isProfile(text.url) && findMetaProperty(text, 'og:title')
    let canonical = findMetaProperty(text, 'og:url')
    if (title && canonical && isProfile(canonical)) {
      let [, name = title] = title.match(/^(.*?)\s*\(@[^)]+\)$/) ?? []
      return {
        title: name || getActor(canonical),
        url: `${APP}/profile/${getActor(canonical)}`
      }
    }
    // Unknown profile has a page without meta tags
    try {
      let profile = await loadProfile(task, getActor(url))
      return {
        title: profile.displayName?.trim() || profile.handle,
        url: toProfileUrl(profile)
      }
    } catch {
      return false
    }
  },

  isMineUrl(url) {
    if (url.hostname !== 'bsky.app') return false
    let profile = url.pathname.match(PROFILE)
    return profile ? decodeURIComponent(profile[1]!) : false
  },

  isPostUrl(url) {
    return url.hostname === 'bsky.app' && POST.test(url.pathname)
  }
}
