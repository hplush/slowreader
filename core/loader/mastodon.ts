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
import { getUpdatedAt, type Loader, toAvatarUrl, toTime } from './common.ts'

// https://docs.joinmastodon.org/entities/Account/
interface MastodonAccount {
  avatar: string
  display_name: string
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
  id: string
  media_attachments: MastodonMedia[]
  poll: null | object
  quote?: MastodonQuote | null
  reblog: MastodonStatus | null
  sensitive: boolean
  spoiler_text: string
  uri: string
  url: null | string
}

const PROFILE = /^\/@([^/]+)\/?$/

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

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseAccount(response: TextResponse): MastodonAccount {
  let account = response.parseJson()
  if (!isObject(account) || typeof account.id !== 'string') {
    throw new ParseError('Mastodon account has no ID', response.text)
  }
  return account as unknown as MastodonAccount
}

function parseStatuses(response: TextResponse): MastodonStatus[] {
  let statuses = response.parseJson()
  if (!Array.isArray(statuses) || !statuses.every(isObject)) {
    throw new ParseError('Mastodon statuses are not an array', response.text)
  }
  return statuses as unknown as MastodonStatus[]
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
function isProfile(response: TextResponse): boolean {
  let url = new URL(response.url)
  if (!PROFILE.test(url.pathname)) return false
  return POPULAR.has(url.hostname) || hasActivityLink(response)
}

function getMeta(response: TextResponse, property: string): string | undefined {
  let document = response.tryParseHTML()
  if (!document) return undefined
  return (
    document
      .querySelector(`meta[property="${property}"]`)
      ?.getAttribute('content') ?? undefined
  )
}

function toAuthor(account: MastodonAccount): PostAuthor {
  let author: PostAuthor = {
    title: account.display_name || account.username,
    url: account.url
  }
  if (account.avatar) author.avatar = account.avatar
  return author
}

/**
 * Mastodon hides parts of links and the quote’s link for old clients
 * by classes, which sanitizer will remove.
 */
function cleanContent(html: string): string {
  if (!html.includes('class="')) return html
  let document = parseDocument(html)
  for (let hidden of document.querySelectorAll('.invisible, .quote-inline')) {
    hidden.remove()
  }
  for (let cut of document.querySelectorAll('.ellipsis')) cut.append('…')
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
    full: cleanContent(status.content),
    publishedAt,
    url: status.url ?? status.uri,
    ...parseMedia(status)
  }
  let preview = parsePreview(status.card)
  if (preview) post.preview = preview
  if (status.spoiler_text) post.warning = status.spoiler_text
  let updatedAt = getUpdatedAt(publishedAt, toTime(status.edited_at))
  if (updatedAt) post.updatedAt = updatedAt
  return post
}

function parseQuote(quote: MastodonQuote): QuotedPost {
  let status = quote.quoted_status
  if (!status) return { missing: true }
  let quoted: QuotedPost = {
    ...parseContent(status),
    author: toAuthor(status.account),
    missing: false
  }
  let deeper = status.quote?.quoted_status
  if (deeper) quoted.quotedUrl = deeper.url ?? deeper.uri
  return quoted
}

function parseStatus(status: MastodonStatus): ParsedPost {
  let shown = status.reblog ?? status
  let post: ParsedPost = {
    ...parseContent(shown),
    originId: status.id,
    publishedAt: toTime(status.created_at)
  }
  if (status.reblog) {
    post.author = toAuthor(shown.account)
    post.repostedBy = toAuthor(status.account)
    post.updatedAt = getUpdatedAt(post.publishedAt, post.updatedAt)
  }
  if (shown.quote) post.quoted = parseQuote(shown.quote)
  if (shown.poll) post.unsupported = true
  return post
}

function getApi(url: string): { acct: string; origin: string } {
  let profile = new URL(url)
  return {
    acct: decodeURIComponent(profile.pathname.match(PROFILE)![1]!),
    origin: profile.origin
  }
}

async function loadAccountId(task: DownloadTask, url: string): Promise<string> {
  let { acct, origin } = getApi(url)
  let response = await task.text(
    `${origin}/api/v1/accounts/lookup?acct=${encodeURIComponent(acct)}`
  )
  return parseAccount(response).id
}

function parseLoaderData(data: null | string | undefined): string | undefined {
  if (!data) return undefined
  try {
    let parsed: unknown = JSON.parse(data)
    if (isObject(parsed) && typeof parsed.id === 'string') return parsed.id
  } catch {}
  return undefined
}

async function loadPage(
  task: DownloadTask,
  origin: string,
  id: string,
  maxId?: string
): Promise<PostsListResult> {
  let statuses = parseStatuses(
    await task.text(
      `${origin}/api/v1/accounts/${id}/statuses?exclude_replies=true` +
        (maxId ? `&max_id=${maxId}` : '')
    )
  )
  let last = statuses[statuses.length - 1]
  return [
    statuses.map(parseStatus),
    last ? () => loadPage(task, origin, id, last.id) : undefined
  ]
}

export const mastodon: Loader = {
  getAvatarFromText(text) {
    if (!isProfile(text)) return undefined
    return toAvatarUrl(getMeta(text, 'og:image'), text.url)
  },

  getMineLinksFromText(text) {
    let url = new URL(text.url)
    let post = url.pathname.match(/^\/(@[^/]+)\/\d+\/?$/)
    if (!post) return []
    if (!POPULAR.has(url.hostname) && !hasActivityLink(text)) return []
    return [`${url.origin}/${post[1]}`]
  },

  async getLoaderData(task, url) {
    return JSON.stringify({ id: await loadAccountId(task, url) })
  },

  getPosts(task, url, text, refreshedAt, loaderData) {
    return createPostsList(async () => {
      let id = parseLoaderData(loaderData) ?? (await loadAccountId(task, url))
      return loadPage(task, getApi(url).origin, id)
    })
  },

  async getPostSource(feed, originId) {
    let task = createDownloadTask()
    let { origin } = getApi(feed.url)
    let response = await task.text(`${origin}/api/v1/statuses/${originId}`)
    return response.parseJson()
  },

  getSuggestedLinksFromText() {
    return []
  },

  isMineText(text) {
    if (!isProfile(text)) return false
    let title = getMeta(text, 'og:title') ?? ''
    return title.replace(/\s*\(@[^)]+\)$/, '') || getApi(text.url).acct
  },

  isMineUrl(url) {
    if (!url.pathname.startsWith('/@')) return false
    let profile = url.pathname.match(PROFILE)
    if (profile && POPULAR.has(url.hostname)) {
      return decodeURIComponent(profile[1]!)
    }
    return undefined
  }
}
