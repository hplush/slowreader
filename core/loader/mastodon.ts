import { getEnvironment } from '../environment.ts'
import {
  HTTPStatusError,
  NotFoundError,
  ParseError,
  UserFacingError
} from '../errors.ts'
import {
  createDownloadTask,
  type DownloadTask,
  type TextResponse
} from '../lib/download.ts'
import { parseDocument } from '../lib/html.ts'
import { createPkce, readString, requestJson } from '../lib/oauth.ts'
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
import {
  type AccountAuth,
  type AccountLoader,
  type FeedData,
  findDocumentLinks,
  findMetaProperty,
  getUpdatedAt,
  isObject,
  type Loader,
  readLoaderData,
  toTime
} from './common.ts'

// https://docs.joinmastodon.org/entities/CustomEmoji/
interface MastodonEmoji {
  shortcode: string
  static_url: string
}

// https://docs.joinmastodon.org/entities/Account/
interface MastodonAccount {
  acct: string
  avatar: string
  display_name: string
  emojis?: MastodonEmoji[]
  id: string
  url: string
  username: string
}

// https://docs.joinmastodon.org/entities/MediaAttachment/
interface MastodonMedia {
  description: null | string
  meta?: { original?: { height?: number; width?: number } } | null
  preview_url: null | string
  remote_url: null | string
  type: 'audio' | 'gifv' | 'image' | 'unknown' | 'video'
  url: null | string
}

// https://docs.joinmastodon.org/entities/PreviewCard/
interface MastodonCard {
  description: string
  image: null | string
  title: string
  url: string
}

// https://docs.joinmastodon.org/entities/Quote/
interface MastodonQuote {
  quoted_status?: MastodonStatus | null
  quoted_status_id?: null | string
  state: string
}

// https://docs.joinmastodon.org/entities/Status/
interface MastodonStatus {
  account: MastodonAccount
  card: MastodonCard | null
  content: string
  created_at: string
  edited_at: null | string
  emojis?: MastodonEmoji[]
  id: string
  in_reply_to_account_id: null | string
  in_reply_to_id: null | string
  media_attachments: MastodonMedia[]
  poll: null | object
  quote?: MastodonQuote | MastodonStatus | null
  reblog: MastodonStatus | null
  replies_count?: number
  sensitive: boolean
  spoiler_text: string
  uri: string
  url: null | string
}

const PROFILE = /^\/@([^/]+)\/?$/

const POST = /^\/(@[^/]+)\/(\d+)\/?$/

const HANDLE = /^@([^@\s/]+)@([^@\s/]+)$/

const SHORTCODE = /:(\w{2,}):/g

const POPULAR = new Set([
  'fosstodon.org',
  'hachyderm.io',
  'infosec.exchange',
  'mas.to',
  'mastodon.online',
  'mastodon.social',
  'mastodon.world',
  'mstdn.jp',
  'mstdn.social',
  'techhub.social'
])

function parseAccount(response: TextResponse): MastodonAccount {
  let account = response.parseJson()
  if (!isObject(account) || typeof account.id !== 'string') {
    throw new ParseError('Mastodon account has no ID', response.text)
  }
  return account as unknown as MastodonAccount
}

function parseStatusList(response: TextResponse): MastodonStatus[] {
  let statuses = response.parseJson()
  if (!Array.isArray(statuses) || !statuses.every(isObject)) {
    throw new ParseError('Mastodon statuses are not an array', response.text)
  }
  return statuses as unknown as MastodonStatus[]
}

function parseStatusResponse(response: TextResponse): MastodonStatus {
  let status = response.parseJson()
  if (!isObject(status) || typeof status.id !== 'string') {
    throw new ParseError('Mastodon status has no ID', response.text)
  }
  return status as unknown as MastodonStatus
}

function hasActivityLink(response: TextResponse): boolean {
  let document = response.tryParseHTML()
  return (
    !!document &&
    !!document.querySelector('link[type="application/activity+json"]')
  )
}

/**
 * Mastodon has no own domain, so on unknown servers any HTML page
 * with ActivityPub link and `/@user` path is a profile.
 */
function isProfile(response: TextResponse, url: string): boolean {
  let parsed = new URL(url)
  if (!PROFILE.test(parsed.pathname)) return false
  return POPULAR.has(parsed.hostname) || hasActivityLink(response)
}

function toProfileUrl(origin: string, acct: string): string {
  let server = `@${new URL(origin).host}`
  return `${origin}/@${acct.endsWith(server) ? acct.slice(0, -server.length) : acct}`
}

/**
 * GoToSocial can serve `user@example.com` from `fedi.example.com`,
 * so the handle’s domain does not say if the profile is local.
 */
function getCanonicalUrl(
  response: TextResponse,
  origin: string
): string | undefined {
  let canonical = findMetaProperty(response, 'og:url')
  if (!canonical || !URL.canParse(canonical)) return undefined
  let parsed = new URL(canonical)
  let profile = parsed.pathname.match(PROFILE)
  if (parsed.origin !== origin || !profile) return undefined
  return `${origin}/@${decodeURIComponent(profile[1]!)}`
}

/**
 * Names are plain text in menus and labels, so we do not show emoji there
 */
function removeShortcodes(name: string): string {
  return name
    .replace(SHORTCODE, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function toAuthor(account: MastodonAccount): PostAuthor {
  let author: PostAuthor = {
    title: removeShortcodes(account.display_name) || account.username,
    url: account.url
  }
  if (account.avatar) author.avatar = account.avatar
  return author
}

function addEmojis(parent: Node, images: Map<string, string>): void {
  // Copy, since replaceWith() changes live childNodes during the loop
  for (let node of Array.from(parent.childNodes)) {
    if (node.nodeType === node.TEXT_NODE) {
      // split() puts shortcodes from the RegExp group to odd indexes
      let parts = node.textContent!.split(SHORTCODE)
      if (parts.length === 1) continue
      node.replaceWith(
        ...parts.map((part, index) => {
          let url = index % 2 === 1 ? images.get(part) : undefined
          if (!url) return index % 2 === 1 ? `:${part}:` : part
          let image = node.ownerDocument!.createElement('img')
          image.className = 'emoji'
          image.src = url
          image.alt = `:${part}:`
          image.title = `:${part}:`
          return image
        })
      )
    } else if (!['a', 'code', 'pre'].includes((node as Element).localName)) {
      addEmojis(node, images)
    }
  }
}

/**
 * Mastodon hides parts of links and the quote’s link for old clients
 * by classes, which sanitizer will remove.
 */
function cleanContent(html: string, emojis: MastodonEmoji[] = []): string {
  if (!html.includes('class="') && emojis.length === 0) return html
  let document = parseDocument(html)
  for (let hidden of document.querySelectorAll('.invisible, .quote-inline')) {
    hidden.remove()
  }
  for (let cut of document.querySelectorAll('.ellipsis')) cut.append('…')
  addEmojis(document.body, toEmojiMap(emojis))
  return document.body.innerHTML
}

function toEmojiMap(emojis: MastodonEmoji[]): Map<string, string> {
  return new Map(emojis.map(emoji => [emoji.shortcode, emoji.static_url]))
}

function textToHtml(text: string, emojis: MastodonEmoji[] = []): string {
  let document = parseDocument('')
  document.body.textContent = text
  addEmojis(document.body, toEmojiMap(emojis))
  return document.body.innerHTML
}

function parseMedia(
  status: MastodonStatus
): Pick<ParsedPost, 'media' | 'mediaSizes'> {
  let media: PostMedia[] = []
  let sizes: (MediaSize | null)[] = []
  for (let attachment of status.media_attachments) {
    let url = attachment.url ?? attachment.remote_url
    if (!url || attachment.type === 'unknown') continue
    let item: PostMedia = {
      type: attachment.type === 'gifv' ? 'video;mode=gif' : attachment.type,
      url
    }
    if (attachment.description) item.alt = attachment.description
    if (attachment.type !== 'image' && attachment.preview_url) {
      item.poster = attachment.preview_url
    }
    if (status.sensitive) item.sensitive = true
    media.push(item)
    let original = attachment.meta?.original
    if (original?.width && original.height) {
      sizes.push({ height: original.height, width: original.width })
    } else {
      sizes.push(null)
    }
  }
  if (media.length === 0) return {}
  if (sizes.every(size => size === null)) return { media }
  return { media, mediaSizes: sizes }
}

function parsePreview(card: MastodonCard | null): PostPreview | undefined {
  if (!card) return undefined
  let preview: PostPreview = { url: card.url }
  if (card.title) preview.title = card.title
  if (card.description) preview.description = card.description
  if (card.image) preview.image = card.image
  return preview
}

function parseContent(status: MastodonStatus): Omit<ParsedPost, 'originId'> {
  let publishedAt = toTime(status.created_at)
  let post: Omit<ParsedPost, 'originId'> = {
    full: cleanContent(status.content, status.emojis),
    publishedAt,
    url: status.url ?? status.uri,
    ...parseMedia(status)
  }
  let preview = parsePreview(status.card)
  if (preview) post.preview = preview
  if (status.spoiler_text) {
    post.warning = textToHtml(status.spoiler_text, status.emojis)
  }
  let updatedAt = getUpdatedAt(publishedAt, toTime(status.edited_at))
  if (updatedAt) post.updatedAt = updatedAt
  return post
}

function unwrapQuote(
  quote: MastodonQuote | MastodonStatus
): MastodonStatus | null | undefined {
  // Sharkey, Akkoma, and Fedibird put the status without Mastodon’s wrapper
  return 'account' in quote ? quote : quote.quoted_status
}

function toQuoted(status: MastodonStatus): QuotedPost {
  let quoted: QuotedPost = {
    ...parseContent(status),
    author: toAuthor(status.account),
    missing: false
  }
  let deeper = status.quote && unwrapQuote(status.quote)
  if (deeper) quoted.quotedUrl = deeper.url ?? deeper.uri
  return quoted
}

function parseQuote(quote: MastodonQuote | MastodonStatus): QuotedPost {
  let quoted = unwrapQuote(quote)
  if (!quoted) return { missing: true }
  return toQuoted(quoted)
}

function parseStatus(status: MastodonStatus): ParsedPost {
  let shown = status.reblog ?? status
  let post: ParsedPost = {
    ...parseContent(shown),
    originId: status.id
  }
  if (status.reblog) {
    post.author = toAuthor(shown.account)
    post.repostedBy = toAuthor(status.account)
    post.sortedAt = toTime(status.created_at)
  }
  if (shown.quote) post.quoted = parseQuote(shown.quote)
  if (shown.poll) post.unsupported = true
  if (shown.replies_count && !shown.in_reply_to_id) post.hasReplies = true
  if (
    !status.reblog &&
    status.in_reply_to_id &&
    status.in_reply_to_account_id === status.account.id
  ) {
    post.selfReplyTo = status.in_reply_to_id
  }
  return post
}

async function loadReplied(
  task: DownloadTask,
  origin: string,
  id: string
): Promise<QuotedPost> {
  try {
    return toQuoted(
      parseStatusResponse(await task.text(`${origin}/api/v1/statuses/${id}`))
    )
  } catch (e) {
    // Deleted or private post
    if (HTTPStatusError.is(e, [404, 410])) return { missing: true }
    throw e
  }
}

async function parseStatuses(
  task: DownloadTask,
  origin: string,
  statuses: MastodonStatus[]
): Promise<ParsedPost[]> {
  return Promise.all(
    statuses.map(async status => {
      let post = parseStatus(status)
      let repliedId = status.reblog?.in_reply_to_id
      if (repliedId) post.replied = await loadReplied(task, origin, repliedId)
      return post
    })
  )
}

function getApi(url: string): { acct: string; origin: string } {
  let profile = new URL(url)
  return {
    acct: decodeURIComponent(profile.pathname.match(PROFILE)![1]!),
    origin: profile.origin
  }
}

async function loadDescendants(
  task: DownloadTask,
  origin: string,
  id: string
): Promise<MastodonStatus[]> {
  let response = await task.text(`${origin}/api/v1/statuses/${id}/context`)
  let context = response.parseJson()
  if (!isObject(context) || !Array.isArray(context.descendants)) {
    throw new ParseError('Mastodon context has no descendants', response.text)
  }
  return context.descendants as MastodonStatus[]
}

function findNextParts(
  descendants: MastodonStatus[],
  startId: string,
  author: string
): MastodonStatus[] {
  function findNext(parentId: string): MastodonStatus | undefined {
    // Several self-replies to one part are branches, the earliest continues
    return descendants
      .filter(
        reply =>
          reply.in_reply_to_id === parentId && reply.account.id === author
      )
      .toSorted(
        (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
      )[0]
  }
  let parts: MastodonStatus[] = []
  let next = findNext(startId)
  while (next) {
    parts.push(next)
    next = findNext(next.id)
  }
  return parts
}

async function loadAccount(
  task: DownloadTask,
  url: string
): Promise<MastodonAccount> {
  let { acct, origin } = getApi(url)
  let response = await task.text(
    `${origin}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`
  )
  return parseAccount(response)
}

async function loadPage(
  task: DownloadTask,
  origin: string,
  id: string,
  maxId?: string
): Promise<PostsListResult> {
  let statuses = parseStatusList(
    await task.text(
      `${origin}/api/v1/accounts/${id}/statuses?exclude_replies=true` +
        (maxId ? `&max_id=${maxId}` : '')
    )
  )
  let last = statuses[statuses.length - 1]
  return [
    await parseStatuses(task, origin, statuses),
    last ? () => loadPage(task, origin, id, last.id) : undefined
  ]
}

interface MastodonApp {
  clientId: string
  clientSecret: string
}

interface MastodonSignIn extends MastodonApp {
  redirect: string
  server: string
  tokenUrl: string
  verifier: string
}

/**
 * Takes `mastodon.social`, `@user@mastodon.social`, or profile URL.
 */
async function resolveServer(
  task: DownloadTask,
  input: string
): Promise<string> {
  let value = input.trim()
  if (/^@?[^@\s/]+@[^@\s/]+$/.test(value)) {
    let [profile] = await mastodon.getProfilesByHandle!(
      task,
      value.replace(/^@?/, '@')
    )
    value = profile!
  }
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    throw new UserFacingError(t.get().invalidServer)
  }
  if (!url.hostname.includes('.')) {
    throw new UserFacingError(t.get().invalidServer)
  }
  return url.origin
}

/**
 * PKCE appeared in Mastodon 4.3 together with the metadata endpoint.
 */
async function loadMetadata(server: string): Promise<Record<string, unknown>> {
  let metadata: Record<string, unknown>
  try {
    metadata = await requestJson(
      `${server}/.well-known/oauth-authorization-server`
    )
  } catch (e) {
    if (HTTPStatusError.is(e, [404])) {
      throw new UserFacingError(t.get().oldMastodon)
    }
    throw e
  }
  let methods = metadata.code_challenge_methods_supported
  if (!Array.isArray(methods) || !methods.includes('S256')) {
    throw new UserFacingError(t.get().oldMastodon)
  }
  return metadata
}

/**
 * Mastodon has no app portal, so the app is registered on every server
 * on the first sign in.
 */
async function registerApp(
  server: string,
  redirect: string
): Promise<MastodonApp> {
  let store = getEnvironment().persistentStore
  let apps = JSON.parse(store['slowreader:mastodonApps'] ?? '{}') as Record<
    string,
    MastodonApp
  >
  let cached = apps[server]
  if (cached) return cached
  let app = await requestJson(`${server}/api/v1/apps`, {
    body: JSON.stringify({
      client_name: 'Slow Reader',
      redirect_uris: redirect,
      scopes: 'read write:follows',
      website: 'https://slowreader.app'
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST'
  })
  let registered = {
    clientId: readString(app, 'client_id'),
    clientSecret: readString(app, 'client_secret')
  }
  store['slowreader:mastodonApps'] = JSON.stringify({
    ...apps,
    [server]: registered
  })
  return registered
}

async function loadOwnAccount(account: {
  accessToken: string
  server: string
}): Promise<MastodonAccount> {
  let json = await requestJson(
    `${account.server}/api/v1/accounts/verify_credentials`,
    { headers: { Authorization: `Bearer ${account.accessToken}` } }
  )
  readString(json, 'id')
  return json as unknown as MastodonAccount
}

function requestByAccount(
  task: DownloadTask,
  auth: AccountAuth,
  path: string,
  method = 'GET'
): Promise<TextResponse> {
  let { credentials, server } = auth.account
  return task.text(
    `${server}${path}`,
    { headers: { Authorization: `Bearer ${credentials.accessToken}` }, method },
    true
  )
}

/**
 * Home timeline has replies to other authors, which profile feeds skip
 * by `exclude_replies`. Author’s replies to own thread are thread parts.
 */
function isReplyToOthers(status: MastodonStatus): boolean {
  return (
    !status.reblog &&
    !!status.in_reply_to_id &&
    status.in_reply_to_account_id !== status.account.id
  )
}

async function loadTimelinePage(
  task: DownloadTask,
  auth: AccountAuth,
  maxId?: string
): Promise<PostsListResult> {
  let statuses = parseStatusList(
    await requestByAccount(
      task,
      auth,
      '/api/v1/timelines/home?limit=40' + (maxId ? `&max_id=${maxId}` : '')
    )
  )
  let last = statuses[statuses.length - 1]
  let shown = statuses.filter(status => !isReplyToOthers(status))
  let posts = await parseStatuses(task, auth.account.server, shown)
  return [
    posts.map((post, index) => ({
      author: toAuthor(shown[index]!.account),
      ...post
    })),
    last ? () => loadTimelinePage(task, auth, last.id) : undefined
  ]
}

/**
 * Author’s ID on the account’s server. The search loads remote authors,
 * which the server did not see before.
 */
async function findAuthorId(
  task: DownloadTask,
  auth: AccountAuth,
  url: string
): Promise<string> {
  let response = await requestByAccount(
    task,
    auth,
    `/api/v2/search?q=${encodeURIComponent(url)}` +
      '&resolve=true&type=accounts&limit=1'
  )
  let result = response.parseJson()
  if (!isObject(result) || !Array.isArray(result.accounts)) {
    throw new ParseError('Mastodon search has no accounts', response.text)
  }
  let found: unknown = result.accounts[0]
  if (!isObject(found) || typeof found.id !== 'string') {
    throw new NotFoundError()
  }
  return found.id
}

function toFeedData(account: MastodonAccount): { handle: string } & FeedData {
  return {
    avatar: account.avatar || undefined,
    handle: `@${account.username}@${new URL(account.url).hostname}`,
    title: removeShortcodes(account.display_name) || account.username,
    url: account.url
  }
}

let mastodonAccount: AccountLoader<MastodonSignIn> = {
  async continueSignIn(task, data, answer) {
    let code = answer.type === 'return' ? answer.params.get('code') : null
    let token = await requestJson(data.tokenUrl, {
      body: new URLSearchParams({
        client_id: data.clientId,
        client_secret: data.clientSecret,
        code: code ?? '',
        code_verifier: data.verifier,
        grant_type: 'authorization_code',
        redirect_uri: data.redirect
      }),
      method: 'POST'
    })
    let accessToken = readString(token, 'access_token')
    return {
      account: {
        ...toFeedData(
          await loadOwnAccount({ accessToken, server: data.server })
        ),
        credentials: {
          accessToken,
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          tokenUrl: data.tokenUrl
        },
        server: data.server
      },
      type: 'done'
    }
  },

  firstField: 'server',

  async follow(task, auth, url) {
    let id = await findAuthorId(task, auth, url)
    await requestByAccount(task, auth, `/api/v1/accounts/${id}/follow`, 'POST')
  },

  getTimeline(task, auth) {
    return createPostsList(() => loadTimelinePage(task, auth))
  },

  async isFollowing(task, auth, url) {
    let id = await findAuthorId(task, auth, url)
    let response = await requestByAccount(
      task,
      auth,
      `/api/v1/accounts/relationships?id[]=${id}`
    )
    let relationships = response.parseJson()
    if (!Array.isArray(relationships)) {
      throw new ParseError('Mastodon relationships are wrong', response.text)
    }
    let relationship: unknown = relationships[0]
    return isObject(relationship) && relationship.following === true
  },

  async startSignIn(task, input) {
    let server = await resolveServer(task, input)
    let metadata = await loadMetadata(server)
    let pkce = await createPkce()
    let app = await registerApp(server, pkce.redirect)
    let url = new URL(readString(metadata, 'authorization_endpoint'))
    url.search = new URLSearchParams({
      client_id: app.clientId,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      redirect_uri: pkce.redirect,
      // Fragment is not sent to the server, so the code will not be in logs
      response_mode: 'fragment',
      response_type: 'code',
      scope: 'read write:follows',
      state: pkce.state
    }).toString()
    return {
      data: {
        ...app,
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
    let id = await findAuthorId(task, auth, url)
    await requestByAccount(
      task,
      auth,
      `/api/v1/accounts/${id}/unfollow`,
      'POST'
    )
  }
}

export const mastodon: Loader = {
  account: mastodonAccount,

  getMineLinksFromText(text) {
    let url = new URL(text.url)
    let post = url.pathname.match(POST)
    if (!post) return []
    if (!POPULAR.has(url.hostname) && !hasActivityLink(text)) return []
    return [`${url.origin}/${post[1]}`]
  },

  async getLoaderData(task, url) {
    return JSON.stringify({ id: (await loadAccount(task, url)).id })
  },

  getPosts(task, url, text, refreshedAt, loaderData) {
    return createPostsList(async () => {
      let id =
        readLoaderData(loaderData, 'id') ?? (await loadAccount(task, url)).id
      return loadPage(task, getApi(url).origin, id)
    })
  },

  async getPostByUrl(task, url) {
    let parsed = new URL(url)
    let status = parseStatusResponse(
      await task.text(
        `${parsed.origin}/api/v1/statuses/${parsed.pathname.match(POST)![2]}`
      )
    )
    return {
      author: toAuthor(status.account),
      ...parseStatus(status),
      id: url
    }
  },

  async getProfilesByHandle(task, handle) {
    let match = handle.match(HANDLE)
    if (!match) return []
    let [, user, host] = match
    // Handle’s domain can differ from the server’s one
    try {
      let response = await task.text(
        `https://${host}/.well-known/webfinger?resource=` +
          encodeURIComponent(`acct:${user}@${host}`)
      )
      let data = response.parseJson()
      if (isObject(data) && Array.isArray(data.links)) {
        let page: unknown = data.links.find(
          link =>
            isObject(link) &&
            link.rel === 'http://webfinger.net/rel/profile-page'
        )
        if (isObject(page) && typeof page.href === 'string') return [page.href]
      }
    } catch {
      // Not every server has WebFinger, but most of them have this path
    }
    return [`https://${host}/@${user}`]
  },

  async getPostSource(feed, originId) {
    let task = createDownloadTask()
    let { origin } = getApi(feed.url)
    let response = await task.text(`${origin}/api/v1/statuses/${originId}`)
    return response.parseJson()
  },

  async getThreadAncestors(task, feedUrl, originId) {
    let { origin } = new URL(feedUrl)
    let response = await task.text(
      `${origin}/api/v1/statuses/${originId}/context`
    )
    let context = response.parseJson()
    if (!isObject(context) || !Array.isArray(context.ancestors)) {
      throw new ParseError('Mastodon context has no ancestors', response.text)
    }
    // Ancestors go from the oldest one, so the author’s chain is in the end
    let ancestors = context.ancestors as MastodonStatus[]
    let author = ancestors.at(-1)?.account.id
    let chain: MastodonStatus[] = []
    for (let i = ancestors.length - 1; i >= 0; i--) {
      if (ancestors[i]!.account.id !== author) break
      chain.unshift(ancestors[i]!)
    }
    if (chain.length === 0 || chain[0]!.in_reply_to_id) return []
    return chain.map(parseStatus)
  },

  async getThreadDescendants(task, feedUrl, originId) {
    let { origin } = new URL(feedUrl)
    let descendants = await loadDescendants(task, origin, originId)
    let author = descendants.find(
      reply => reply.in_reply_to_id === originId
    )?.in_reply_to_account_id
    if (author) {
      return findNextParts(descendants, originId, author).map(parseStatus)
    }
    // Reblog has no replies, they are linked to the original post
    let { reblog } = parseStatusResponse(
      await task.text(`${origin}/api/v1/statuses/${originId}`)
    )
    if (!reblog) return []
    return findNextParts(
      await loadDescendants(task, origin, reblog.id),
      reblog.id,
      reblog.account.id
    ).map(part => ({ ...parseStatus(part), author: toAuthor(part.account) }))
  },

  getSuggestedLinksFromText() {
    return []
  },

  getWorseLinksFromText(text) {
    return findDocumentLinks(text, 'application/rss+xml')
  },

  async detectFeed(text, task, url) {
    if (!isProfile(text, url)) return false
    let { acct, origin } = getApi(url)
    // Redirect page could have meta of something else
    let title = isProfile(text, text.url) && findMetaProperty(text, 'og:title')
    if (title) {
      let [, name = title, handle = acct] =
        title.match(/^(.*?)\s*\(@([^)]+)\)$/) ?? []
      return {
        title: removeShortcodes(name) || acct,
        url: getCanonicalUrl(text, origin) ?? toProfileUrl(origin, handle)
      }
    }
    // Remote profiles are rendered by JS, so HTML has no meta tags
    try {
      let account = await loadAccount(task, url)
      return {
        title: removeShortcodes(account.display_name) || account.username,
        url: toProfileUrl(origin, account.acct)
      }
    } catch {
      return { title: acct, url: toProfileUrl(origin, acct) }
    }
  },

  async loadFeedData(task, url, opts = {}) {
    return toFeedData(
      opts.account
        ? await loadOwnAccount({
            accessToken: opts.account.credentials.accessToken,
            server: opts.account.server
          })
        : await loadAccount(task, url)
    )
  },

  isMineUrl(url) {
    if (!url.pathname.startsWith('/@')) return false
    let profile = url.pathname.match(PROFILE)
    if (profile && POPULAR.has(url.hostname)) {
      return decodeURIComponent(profile[1]!)
    }
    return undefined
  },

  isPostUrl(url) {
    return POST.test(url.pathname)
  }
}
