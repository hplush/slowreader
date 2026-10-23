import {
  detectNetworkError,
  HTTPStatusError,
  ParseError,
  UserFacingError
} from '../errors.ts'
import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { parseDocument } from '../lib/html.ts'
import { toBase64 } from '../lib/keys.ts'
import {
  createPkce,
  parseJson,
  randomToken,
  readString,
  requestJson,
  sha256
} from '../lib/oauth.ts'
import { accountsMessages as t } from '../messages/index.ts'
import type {
  MediaSize,
  ParsedPost,
  PostAuthor,
  PostMedia,
  PostPreview,
  QuotedPost
} from '../post.ts'
import { createPostsList, type PostsListResult } from '../posts-list.ts'
import { request } from '../request.ts'
import type { AccountCredentials, DpopKey } from '../schema.ts'
import {
  type AccountAuth,
  type AccountLoader,
  type FeedData,
  findDocumentLinks,
  findMetaProperty,
  isObject,
  type Loader,
  readLoaderData,
  toLang,
  toTime
} from './common.ts'

// https://docs.bsky.app/docs/api/app-bsky-actor-get-profile
interface BlueskyProfile {
  avatar?: string
  did: string
  displayName?: string
  handle: string
  viewer?: { following?: string }
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
  langs?: string[]
  reply?: { parent: { uri: string }; root: { uri: string } }
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
  replyCount?: number
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
  replies?: BlueskyThread[]
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

function isDomainRoot(url: string): boolean {
  let { hostname, pathname, search } = new URL(url)
  return pathname === '/' && !search && hostname.includes('.')
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
  let lang = toLang(record.langs?.[0])
  if (lang) post.lang = lang
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
  if (post.replyCount && !post.record.reply) parsed.hasReplies = true
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
    post.sortedAt = toTime(item.reason.indexedAt)
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
  parentHeight: number,
  depth: number
): Promise<BlueskyThread> {
  return parseThread(
    await task.text(
      `${API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}` +
        `&depth=${depth}&parentHeight=${parentHeight}`
    )
  )
}

/**
 * Earlier refresh already loaded them
 */
function isOlderThanRefresh(
  item: BlueskyFeedItem,
  refreshedAt: number | undefined
): boolean {
  let date = toTime(item.reason?.indexedAt ?? item.post.record.createdAt)
  return !!refreshedAt && !!date && date < refreshedAt
}

/**
 * Feed has replies to others too, which we skip like Mastodon’s
 * `exclude_replies`. Author’s replies to own thread are thread parts.
 */
function isReplyToOthers(item: BlueskyFeedItem): boolean {
  let reply = item.post.record.reply
  if (item.reason || !reply) return false
  let author = item.post.author.did
  return (
    getDid(reply.parent.uri) !== author || getDid(reply.root.uri) !== author
  )
}

/**
 * Thread API returns only 10 levels of replies
 */
async function loadSelfReplies(
  task: DownloadTask,
  findPds: PdsFinder,
  uri: string
): Promise<ParsedPost[]> {
  let author = getDid(uri)
  let parts: BlueskyPost[] = []
  let current: BlueskyThread | undefined = await loadThread(task, uri, 0, 10)
  while (current) {
    if (!current.replies && current.post?.replyCount) {
      current = await loadThread(task, current.post.uri, 0, 10)
    }
    // Bluesky shows the earliest self-reply as the next part
    current = current.replies
      ?.filter(reply => reply.post?.author.did === author)
      .toSorted(
        (a, b) =>
          Date.parse(a.post!.record.createdAt) -
          Date.parse(b.post!.record.createdAt)
      )[0]
    if (current) parts.push(current.post!)
  }
  return Promise.all(
    parts.map(async part => ({
      ...(await parsePost(part, findPds)),
      author: toAuthor(part.author)
    }))
  )
}

async function loadPage(
  task: DownloadTask,
  findPds: PdsFinder,
  actor: string,
  refreshedAt: number | undefined,
  cursor?: string
): Promise<PostsListResult> {
  let page = parseFeed(
    await task.text(
      `${API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}` +
        '&filter=posts_with_replies' +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '')
    )
  )
  let next = page.cursor
  return [
    await Promise.all(
      page.feed
        .filter(item => !isReplyToOthers(item))
        .map(item => parseItem(item, findPds))
    ),
    // Replies to others could make the whole page empty
    next &&
    page.feed.length > 0 &&
    !isOlderThanRefresh(page.feed.at(-1)!, refreshedAt)
      ? () => loadPage(task, findPds, actor, refreshedAt, next)
      : undefined
  ]
}

/**
 * Bluesky has no app registration: client ID is the URL of the metadata file.
 * Server’s `entrypoint.ts` generates it for every domain.
 */
export function getBlueskyClientId(redirect: string): string {
  let { hostname, origin } = new URL(redirect)
  if (hostname === '127.0.0.1' || hostname === '[::1]') {
    // Special development client, which needs no metadata file
    return (
      `http://localhost?redirect_uri=${encodeURIComponent(redirect)}` +
      `&scope=${encodeURIComponent('atproto transition:generic')}`
    )
  }
  return `${origin}/oauth/bluesky.json`
}

/**
 * Key is extractable to sync it with tokens between devices.
 */
async function generateDpopKey(): Promise<DpopKey> {
  let pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )
  let jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
  return { crv: jwk.crv!, d: jwk.d!, kty: jwk.kty!, x: jwk.x!, y: jwk.y! }
}

function encodeJson(json: object): string {
  return toBase64(new TextEncoder().encode(JSON.stringify(json)))
}

async function createDpopProof(
  key: DpopKey,
  method: string,
  url: string,
  nonce: string | undefined,
  accessToken?: string
): Promise<string> {
  let privateKey = await crypto.subtle.importKey(
    'jwk',
    key,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  let header = encodeJson({
    alg: 'ES256',
    jwk: { crv: key.crv, kty: key.kty, x: key.x, y: key.y },
    typ: 'dpop+jwt'
  })
  let payload = encodeJson({
    ath: accessToken && (await sha256(accessToken)),
    htm: method,
    htu: url.split('?')[0],
    iat: Math.floor(Date.now() / 1000),
    jti: randomToken(),
    nonce
  })
  let signature = await crypto.subtle.sign(
    { hash: 'SHA-256', name: 'ECDSA' },
    privateKey,
    new TextEncoder().encode(`${header}.${payload}`)
  )
  return `${header}.${payload}.${toBase64(new Uint8Array(signature))}`
}

/**
 * Server asks to repeat the first request with its nonce.
 */
async function dpopPost(
  key: DpopKey,
  url: string,
  body: URLSearchParams,
  nonce?: string
): Promise<Record<string, unknown>> {
  let proof = await createDpopProof(key, 'POST', url, nonce)
  let response = await detectNetworkError(() => {
    return request(
      url,
      { body, headers: { DPoP: proof }, method: 'POST' },
      true
    )
  })
  if (!response.ok) {
    let text = await response.text()
    let next = response.headers.get('DPoP-Nonce')
    if (!nonce && next && text.includes('use_dpop_nonce')) {
      return dpopPost(key, url, body, next)
    }
    throw new HTTPStatusError(response.status, url, text, response.headers)
  }
  return parseJson(response)
}

function toCredentials(
  token: Record<string, unknown>,
  previous: Omit<AccountCredentials, 'accessToken' | 'refreshToken'>
): AccountCredentials {
  return {
    ...previous,
    accessToken: readString(token, 'access_token'),
    expiresAt:
      typeof token.expires_in === 'number'
        ? Math.round(Date.now() / 1000) + token.expires_in
        : undefined,
    refreshToken: readString(token, 'refresh_token')
  }
}

async function refreshTokens(auth: AccountAuth): Promise<void> {
  let { credentials } = auth.account
  let token: Record<string, unknown>
  try {
    token = await dpopPost(
      credentials.dpopKey!,
      credentials.tokenUrl,
      new URLSearchParams({
        client_id: credentials.clientId,
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken ?? ''
      })
    )
  } catch (e) {
    if (!HTTPStatusError.is(e, [400, 401])) throw e
    let fromOtherDevice = await auth.reload()
    if (!fromOtherDevice) throw new UserFacingError(t.get().signInAgain)
    auth.account = { ...auth.account, credentials: fromOtherDevice }
    return
  }
  let refreshed = toCredentials(token, credentials)
  auth.account = { ...auth.account, credentials: refreshed }
  await auth.save(refreshed)
}

/**
 * PDS asks for a new nonce from time to time, so the last one is kept
 * to not repeat every request.
 */
let pdsNonces = new Map<string, string>()

function needNonce(error: HTTPStatusError): boolean {
  return (
    error.response.includes('use_dpop_nonce') ||
    !!error.headers.get('WWW-Authenticate')?.includes('use_dpop_nonce')
  )
}

/**
 * Request to user’s PDS, which proxies `app.bsky.*` methods to AppView.
 */
async function requestByAccount(
  task: DownloadTask,
  auth: AccountAuth,
  path: string,
  body?: object,
  retried: { nonce?: true; token?: true } = {}
): Promise<TextResponse> {
  let { credentials, server } = auth.account
  let now = Math.round(Date.now() / 1000)
  if (!retried.token && credentials.expiresAt && credentials.expiresAt < now) {
    await refreshTokens(auth)
    return requestByAccount(task, auth, path, body, { ...retried, token: true })
  }
  let url = `${server}/xrpc/${path}`
  let method = body ? 'POST' : 'GET'
  let { origin } = new URL(url)
  let headers: Record<string, string> = {
    Authorization: `DPoP ${credentials.accessToken}`,
    DPoP: await createDpopProof(
      credentials.dpopKey!,
      method,
      url,
      pdsNonces.get(origin),
      credentials.accessToken
    )
  }
  if (body) headers['Content-Type'] = 'application/json'
  try {
    let response = await task.text(
      url,
      { body: body && JSON.stringify(body), headers, method },
      true
    )
    let nonce = response.headers.get('DPoP-Nonce')
    if (nonce) pdsNonces.set(origin, nonce)
    return response
  } catch (e) {
    if (!HTTPStatusError.is(e, [400, 401])) throw e
    let nonce = e.headers.get('DPoP-Nonce')
    if (nonce) pdsNonces.set(origin, nonce)
    if (!retried.nonce && nonce && needNonce(e)) {
      return requestByAccount(task, auth, path, body, {
        ...retried,
        nonce: true
      })
    }
    if (!retried.token && e.status === 401) {
      await refreshTokens(auth)
      return requestByAccount(task, auth, path, body, {
        ...retried,
        token: true
      })
    }
    throw e
  }
}

async function loadTimelinePage(
  task: DownloadTask,
  auth: AccountAuth,
  findPds: PdsFinder,
  refreshedAt: number | undefined,
  cursor?: string
): Promise<PostsListResult> {
  let page = parseFeed(
    await requestByAccount(
      task,
      auth,
      'app.bsky.feed.getTimeline?limit=50' +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '')
    )
  )
  let next = page.cursor
  return [
    await Promise.all(
      page.feed
        .filter(item => !isReplyToOthers(item))
        .map(async item => ({
          author: toAuthor(item.post.author),
          ...(await parseItem(item, findPds))
        }))
    ),
    next &&
    page.feed.length > 0 &&
    !isOlderThanRefresh(page.feed.at(-1)!, refreshedAt)
      ? () => loadTimelinePage(task, auth, findPds, refreshedAt, next)
      : undefined
  ]
}

async function loadProfileByAccount(
  task: DownloadTask,
  auth: AccountAuth,
  url: string
): Promise<BlueskyProfile> {
  return parseProfile(
    await requestByAccount(
      task,
      auth,
      `app.bsky.actor.getProfile?actor=${encodeURIComponent(getActor(url))}`
    )
  )
}

/**
 * Takes `@user.bsky.social`, `user.bsky.social`, or profile URL.
 */
function parseHandle(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?bsky\.app\/profile\//i, '')
    .replace(/\/$/, '')
    .replace(/^@?/, '@')
}

/**
 * Accounts on Eurosky, Blacksky, or self-hosted PDS can’t sign in
 * through `bsky.social`, so we always ask the handle to find user’s server.
 */
async function resolveHandle(
  task: DownloadTask,
  input: string
): Promise<{ did: string; handle: string; server: string }> {
  let [profile] = await bluesky.getProfilesByHandle!(task, parseHandle(input))
  if (!profile) throw new UserFacingError(t.get().invalidHandle)
  let handle = profile.split('/').pop()!
  let resolved: unknown
  try {
    let response = await task.text(
      'https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle' +
        `?handle=${encodeURIComponent(handle)}`
    )
    resolved = response.parseJson()
  } catch (e) {
    if (HTTPStatusError.is(e, [400, 404])) {
      throw new UserFacingError(t.get().unknownHandle)
    }
    throw e
  }
  if (!isObject(resolved) || typeof resolved.did !== 'string') {
    throw new UserFacingError(t.get().unknownHandle)
  }
  let server = await loadPds(task, resolved.did)
  if (!server) throw new UserFacingError(t.get().unknownHandle)
  return { did: resolved.did, handle, server }
}

interface BlueskySignIn {
  clientId: string
  did: string
  dpopKey: DpopKey
  issuer: string
  redirect: string
  server: string
  tokenUrl: string
  verifier: string
}

function toFeedData(profile: BlueskyProfile): { handle: string } & FeedData {
  return {
    avatar: profile.avatar,
    handle: `@${profile.handle}`,
    title: profile.displayName || profile.handle,
    url: toProfileUrl(profile)
  }
}

let blueskyAccount: AccountLoader<BlueskySignIn> = {
  async continueSignIn(task, data, answer) {
    let params =
      answer.type === 'return' ? answer.params : new URLSearchParams()
    if (params.get('iss') !== data.issuer) {
      throw new UserFacingError(t.get().signInFailed)
    }
    let token = await dpopPost(
      data.dpopKey,
      data.tokenUrl,
      new URLSearchParams({
        client_id: data.clientId,
        code: params.get('code') ?? '',
        code_verifier: data.verifier,
        grant_type: 'authorization_code',
        redirect_uri: data.redirect
      })
    )
    if (token.sub !== data.did) {
      throw new UserFacingError(t.get().signInFailed)
    }
    return {
      account: {
        ...toFeedData(await loadProfile(task, data.did)),
        credentials: toCredentials(token, {
          clientId: data.clientId,
          dpopKey: data.dpopKey,
          tokenUrl: data.tokenUrl
        }),
        server: data.server,
        // DID URL keeps working after the handle change
        url: `${APP}/profile/${data.did}`
      },
      type: 'done'
    }
  },

  firstField: 'handle',

  async follow(task, auth, url) {
    let profile = await loadProfileByAccount(task, auth, url)
    if (profile.viewer?.following) return
    await requestByAccount(task, auth, 'com.atproto.repo.createRecord', {
      collection: 'app.bsky.graph.follow',
      record: {
        $type: 'app.bsky.graph.follow',
        createdAt: new Date().toISOString(),
        subject: profile.did
      },
      repo: getActor(auth.account.url)
    })
  },

  getTimeline(task, auth, refreshedAt) {
    return createPostsList(() =>
      loadTimelinePage(task, auth, createPdsFinder(task), refreshedAt)
    )
  },

  async isFollowing(task, auth, url) {
    let profile = await loadProfileByAccount(task, auth, url)
    return !!profile.viewer?.following
  },

  async startSignIn(task, input) {
    let { did, handle, server } = await resolveHandle(task, input)
    let resource = await requestJson(
      `${server}/.well-known/oauth-protected-resource`
    )
    let issuers = resource.authorization_servers
    if (!Array.isArray(issuers) || typeof issuers[0] !== 'string') {
      throw new UserFacingError(t.get().signInFailed)
    }
    let metadata = await requestJson(
      `${issuers[0]}/.well-known/oauth-authorization-server`
    )
    let pkce = await createPkce()
    let clientId = getBlueskyClientId(pkce.redirect)
    let dpopKey = await generateDpopKey()
    let pushed = await dpopPost(
      dpopKey,
      readString(metadata, 'pushed_authorization_request_endpoint'),
      new URLSearchParams({
        client_id: clientId,
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
        login_hint: handle,
        redirect_uri: pkce.redirect,
        // Fragment is not sent to the server, so the code will not be in logs
        response_mode: 'fragment',
        response_type: 'code',
        scope: 'atproto transition:generic',
        state: pkce.state
      })
    )
    let url = new URL(readString(metadata, 'authorization_endpoint'))
    url.search = new URLSearchParams({
      client_id: clientId,
      request_uri: readString(pushed, 'request_uri')
    }).toString()
    return {
      data: {
        clientId,
        did,
        dpopKey,
        issuer: readString(metadata, 'issuer'),
        redirect: pkce.redirect,
        server,
        tokenUrl: readString(metadata, 'token_endpoint'),
        verifier: pkce.verifier
      },
      state: pkce.state,
      type: 'open',
      url: url.href
    }
  },

  async unfollow(task, auth, url) {
    let profile = await loadProfileByAccount(task, auth, url)
    let following = profile.viewer?.following
    if (!following) return
    await requestByAccount(task, auth, 'com.atproto.repo.deleteRecord', {
      collection: 'app.bsky.graph.follow',
      repo: getActor(auth.account.url),
      rkey: following.split('/').pop()
    })
  }
}

export const bluesky: Loader = {
  account: blueskyAccount,

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
        readLoaderData(loaderData, 'did') ?? getActor(url),
        refreshedAt
      )
    )
  },

  async getPostByUrl(task, url) {
    let [, actor, rkey] = new URL(url).pathname.match(POST)!
    let thread = await loadThread(
      task,
      `at://${decodeURIComponent(actor!)}/app.bsky.feed.post/${rkey}`,
      0,
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
    let thread = await loadThread(createDownloadTask(), originId, 0, 0)
    return thread.post
  },

  async getThreadAncestors(task, feedUrl, originId) {
    let thread = await loadThread(task, originId, 1000, 0)
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

  getThreadDescendants(task, feedUrl, originId) {
    return loadSelfReplies(task, createPdsFinder(task), originId)
  },

  getSuggestedLinksFromText() {
    return []
  },

  getWorseLinksFromText(text) {
    return findDocumentLinks(text, 'application/rss+xml').filter(
      link => new URL(link).hostname === 'bsky.app'
    )
  },

  async detectFeed(text, task, url) {
    let actor: string
    if (isProfile(url)) {
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
      actor = getActor(url)
    } else if (isDomainRoot(url) && text.contentType.includes('html')) {
      // Custom domain handle can redirect to any site
      actor = new URL(url).hostname
    } else {
      return false
    }
    // Unknown profile has a page without meta tags
    try {
      let profile = await loadProfile(task, actor)
      return {
        title: profile.displayName?.trim() || profile.handle,
        url: toProfileUrl(profile)
      }
    } catch {
      return false
    }
  },

  async loadFeedData(task, url) {
    return toFeedData(await loadProfile(task, getActor(url)))
  },

  isMineUrl(url) {
    if (isDomainRoot(url.href)) return undefined
    if (url.hostname !== 'bsky.app') return false
    let profile = url.pathname.match(PROFILE)
    return profile ? decodeURIComponent(profile[1]!) : false
  },

  isPostUrl(url) {
    return url.hostname === 'bsky.app' && POST.test(url.pathname)
  },

  isProfileUrl(url) {
    return url.hostname === 'bsky.app' && PROFILE.test(url.pathname)
  }
}
