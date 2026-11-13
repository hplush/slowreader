import { persistentJSON } from '@nanostores/persistent'
import { decodeTelegramApp, type TelegramApp } from '@slowreader/api'
import { nanoid } from 'nanoid'

import { onClient } from '../client.ts'
import { deviceSessions, forgetDeviceSession } from '../device-sessions.ts'
import {
  getEnvironment,
  type TelegramClient,
  type TelegramObject,
  type TelegramRequest
} from '../environment.ts'
import { NotFoundError, TelegramError, UserFacingError } from '../errors.ts'
import { escapeXml } from '../lib/html.ts'
import { accountsMessages as t } from '../messages/index.ts'
import type {
  LoadedAuthor,
  MediaSize,
  ParsedPost,
  PostAuthor,
  PostMedia,
  PostPoll,
  PostPreview,
  QuotedPost
} from '../post.ts'
import {
  createPostsList,
  type PostsList,
  type PostsListResult
} from '../posts-list.ts'
import { request } from '../request.ts'
import {
  type AccountAuth,
  type AccountLoader,
  type DetectedFeed,
  isObject,
  type Loader,
  readLoaderData,
  type SignInStep
} from './common.ts'

/**
 * App ID from our server. It is saved, since TDLib needs it on every start,
 * also offline.
 */
export const telegramApp = persistentJSON<TelegramApp | undefined>(
  'slowreader:telegram-app',
  undefined
)

/**
 * Server without app ID has no Telegram. Offline keeps the saved app ID.
 */
export async function loadTelegramApp(): Promise<void> {
  if (!getEnvironment().telegramCreator) return
  let response
  try {
    response = await request('/telegram-app.json', {}, true)
  } catch {
    return
  }
  let encoded: unknown = response.ok ? await response.json() : undefined
  telegramApp.set(
    typeof encoded === 'string' ? decodeTelegramApp(encoded) : undefined
  )
}

interface Session {
  client: TelegramClient
  /**
   * We asked TDLib to end the session, so it is not user’s sign out
   * in another Telegram app.
   */
  ending: boolean
  idle: ReturnType<typeof setTimeout> | undefined
  /**
   * Sign in form waits for user’s answer longer, than TDLib’s idle time.
   */
  keep: boolean
  /**
   * Parallel refreshes of channels share one loading of the chat list.
   */
  loadingChats: Promise<void> | undefined
  sponsored: Map<string, TelegramObject>
  state: TelegramObject | undefined
  waiters: Set<(state: TelegramObject) => void>
}

let sessions = new Map<string, Session>()

function getSession(name: string): Session {
  let session = sessions.get(name)
  if (session) return session
  let app = telegramApp.get()
  let creator = getEnvironment().telegramCreator
  if (!app || !creator) throw new Error('No Telegram on this client')
  let created: Session = {
    client: creator({ ...app, name }),
    ending: false,
    idle: undefined,
    keep: false,
    loadingChats: undefined,
    sponsored: new Map(),
    state: undefined,
    waiters: new Set()
  }
  created.client.onUpdate(update => {
    if (update['@type'] !== 'updateAuthorizationState') return
    let state = update.authorization_state
    if (!isObject(state) || typeof state['@type'] !== 'string') return
    created.state = { ...state, '@type': state['@type'] }
    for (let waiter of created.waiters) waiter(created.state)
    created.waiters.clear()
    if (state['@type'] === 'authorizationStateLoggingOut' && !created.ending) {
      forgetDeviceSession(name)
      void destroyTelegram(name)
    }
  })
  sessions.set(name, created)
  return created
}

/**
 * TDLib has no reason to keep the connection with Telegram between refreshes.
 */
function closeOnIdle(session: Session): void {
  clearTimeout(session.idle)
  if (session.keep) return
  session.idle = setTimeout(() => {
    void session.client.close()
  }, 60_000)
}

export async function sendToTelegram(
  name: string,
  body: TelegramRequest
): Promise<TelegramObject> {
  let session = getSession(name)
  clearTimeout(session.idle)
  try {
    return await session.client.send(body)
  } finally {
    closeOnIdle(session)
  }
}

function getTelegramAuthState(name: string): TelegramObject | undefined {
  return sessions.get(name)?.state
}

/**
 * TDLib tells about the next step of the sign in by an update,
 * which can come before or after the answer to our request.
 */
function waitTelegramAuthState(
  name: string,
  previous: TelegramObject | undefined
): Promise<TelegramObject> {
  let session = getSession(name)
  if (session.state && session.state !== previous) {
    return Promise.resolve(session.state)
  }
  return new Promise(resolve => {
    session.waiters.add(resolve)
  })
}

function keepTelegramRunning(name: string, keep: boolean): void {
  let session = getSession(name)
  session.keep = keep
  closeOnIdle(session)
}

/**
 * Delete session key and other TDLib’s data of this account from the device.
 */
async function destroyTelegram(name: string): Promise<void> {
  let session = sessions.get(name)
  if (!session) return
  session.ending = true
  clearTimeout(session.idle)
  sessions.delete(name)
  await session.client.destroy()
}

/**
 * End the session in Telegram too, so its devices list will not show it.
 * Offline we can not wait for Telegram forever.
 */
async function signOutFromTelegram(name: string): Promise<void> {
  let session = getSession(name)
  session.ending = true
  let timeout: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    session.client.send({ '@type': 'logOut' }).catch(() => {}),
    new Promise(resolve => {
      timeout = setTimeout(resolve, 10_000)
    })
  ])
  clearTimeout(timeout)
  await destroyTelegram(name)
}

async function closeTelegram(): Promise<void> {
  let closing = [...sessions.values()]
  sessions.clear()
  await Promise.all(
    closing.map(session => {
      clearTimeout(session.idle)
      return session.client.close()
    })
  )
}

onClient(() => () => {
  void closeTelegram()
})

interface SignInData {
  /**
   * Name of TDLib database. It is created before the sign in,
   * since TDLib keeps the session key there from the first request.
   */
  name: string
}

function toUserError(error: unknown): unknown {
  if (!TelegramError.is(error)) return error
  if (error.code === 429 || error.message.includes('FLOOD')) {
    return new UserFacingError(t.get().tooManyAttempts)
  } else if (error.message.includes('PHONE_NUMBER_INVALID')) {
    return new UserFacingError(t.get().invalidPhone)
  } else if (error.message.includes('CODE_EXPIRED')) {
    return new UserFacingError(t.get().expiredCode)
  } else if (/CODE_(INVALID|EMPTY)/.test(error.message)) {
    return new UserFacingError(t.get().invalidCode)
  } else if (error.message.includes('PASSWORD_HASH_INVALID')) {
    return new UserFacingError(t.get().invalidPassword)
  } else {
    return error
  }
}

/**
 * Users and channels can have a few usernames. The first one is the main.
 */
function getUsername(owner: TelegramObject): string | undefined {
  let usernames = isObject(owner.usernames)
    ? owner.usernames.active_usernames
    : []
  return Array.isArray(usernames)
    ? (usernames[0] as string | undefined)
    : undefined
}

function getUserName(user: TelegramObject): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ')
}

/**
 * `id` of the channel is the one from t.me/c/ links.
 */
function getAvatar(
  owner: 'channel' | 'user',
  id: unknown,
  photo: unknown
): { avatar: string } | undefined {
  let file = isObject(photo) ? photo.small : undefined
  if (!isObject(file) || !isObject(file.remote)) return undefined
  return {
    avatar:
      `telegram:${owner === 'user' ? 'user/' : ''}${Number(id)}/avatar/` +
      // New photo gets a new URL, so media cache will not keep the old one
      String(file.remote.unique_id)
  }
}

async function loadAccount(
  name: string
): Promise<Extract<SignInStep<SignInData>, { type: 'done' }>> {
  let user = await sendToTelegram(name, { '@type': 'getMe' })
  let username = getUsername(user)
  let title = getUserName(user)
  return {
    account: {
      ...getAvatar('user', user.id, user.profile_photo),
      handle: username ? `@${username}` : title,
      reading: 'slow',
      server: 'https://t.me',
      title,
      // Next sign in finds the account by URL. User can change the name
      // and username, but not the ID.
      url: `tg://user?id=${String(user.id)}`
    },
    device: name,
    type: 'done'
  }
}

function getCodeLabel(state: TelegramObject): string | undefined {
  let info = state.code_info
  if (!isObject(info) || !isObject(info.type)) return undefined
  let type = String(info.type['@type'])
  if (type === 'authenticationCodeTypeTelegramMessage') {
    return t.get().codeFromApp
  } else if (type.startsWith('authenticationCodeTypeSms')) {
    return t.get().codeFromSms
  } else if (type === 'authenticationCodeTypeCall') {
    return t.get().codeFromCall
  } else if (type === 'authenticationCodeTypeFragment') {
    return t.get().codeFromFragment
  } else {
    return undefined
  }
}

async function toStep(
  name: string,
  state: TelegramObject
): Promise<SignInStep<SignInData>> {
  if (state['@type'] === 'authorizationStateWaitCode') {
    return {
      data: { name },
      field: 'code',
      label: getCodeLabel(state),
      type: 'ask'
    }
  } else if (state['@type'] === 'authorizationStateWaitEmailCode') {
    return { data: { name }, field: 'emailCode', type: 'ask' }
  } else if (state['@type'] === 'authorizationStateWaitPassword') {
    return { data: { name }, field: 'password', type: 'ask' }
  } else if (state['@type'] === 'authorizationStateReady') {
    let done = await loadAccount(name)
    keepTelegramRunning(name, false)
    return done
  } else {
    // Sign up, forced email setup, or another step, which we do not support
    await destroyTelegram(name)
    throw new UserFacingError(t.get().telegramOfficialApp)
  }
}

async function sendAnswer(
  name: string,
  body: TelegramRequest
): Promise<SignInStep<SignInData>> {
  let previous = getTelegramAuthState(name)
  try {
    await sendToTelegram(name, body)
  } catch (e) {
    throw toUserError(e)
  }
  return toStep(name, await waitTelegramAuthState(name, previous))
}

function getDevice(auth: AccountAuth): string {
  if (!auth.device) throw new Error('No Telegram session on this device')
  return auth.device
}

async function loadAllChats(name: string): Promise<void> {
  let more = true
  while (more) {
    try {
      await sendToTelegram(name, {
        '@type': 'loadChats',
        'chat_list': { '@type': 'chatListMain' },
        'limit': 100
      })
    } catch (e) {
      // TDLib loads the list by parts and answers 404 after the last one
      if (!TelegramError.is(e) || e.code !== 404) throw e
      more = false
    }
  }
}

function loadChatList(name: string): Promise<void> {
  let session = getSession(name)
  session.loadingChats ??= loadAllChats(name).finally(() => {
    session.loadingChats = undefined
  })
  return session.loadingChats
}

async function loadChannelUrl(
  name: string,
  supergroupId: unknown
): Promise<string> {
  let username = getUsername(
    await sendToTelegram(name, {
      '@type': 'getSupergroup',
      'supergroup_id': supergroupId
    })
  )
  return username
    ? `https://t.me/${username}`
    : `https://t.me/c/${String(supergroupId)}`
}

/**
 * Chat list has private chats and groups too. We take only channels
 * and drop the rest here, so they never reach the database.
 */
async function loadChannels(name: string): Promise<LoadedAuthor[]> {
  await loadChatList(name)
  let loaded = await sendToTelegram(name, {
    '@type': 'getChats',
    'chat_list': { '@type': 'chatListMain' },
    'limit': 100_000
  })
  let chats = await Promise.all(
    (Array.isArray(loaded.chat_ids) ? loaded.chat_ids : []).map(id =>
      sendToTelegram(name, { '@type': 'getChat', 'chat_id': id })
    )
  )
  let channels = await Promise.all(
    chats.map(async chat => {
      let id = getChannelId(chat)
      if (id === undefined) return undefined
      return {
        ...getAvatar('channel', id, chat.photo),
        // Channel can change the username, but not the ID
        loaderData: JSON.stringify({ id: String(chat.id) }),
        title: String(chat.title),
        url: await loadChannelUrl(name, id)
      }
    })
  )
  return channels.filter(channel => !!channel)
}

/**
 * TDLib knows only chats from the loaded chat list, and forgets them
 * on every restart.
 */
async function loadChat(name: string, chatId: number): Promise<TelegramObject> {
  let body = { '@type': 'getChat', 'chat_id': chatId }
  try {
    return await sendToTelegram(name, body)
  } catch (e) {
    if (!TelegramError.is(e)) throw e
    await loadChatList(name)
    return sendToTelegram(name, body)
  }
}

/**
 * Feed’s preview and a feed without account have no account to ask,
 * so we try every Telegram session of this device.
 */
async function askAnySession<Answer>(
  ask: (name: string) => Promise<Answer>
): Promise<Answer> {
  let error: unknown = new TelegramError(
    401,
    'No Telegram session on this device'
  )
  for (let { device, service } of Object.values(deviceSessions.get())) {
    if (service !== 'telegram') continue
    try {
      return await ask(device)
    } catch (e) {
      if (!TelegramError.is(e)) throw e
      error = e
    }
  }
  throw error
}

/**
 * TDLib chat ID of a private channel, or username of a public one.
 */
/**
 * `channel` is TDLib chat ID of a private channel, username of a public one,
 * or invite code with `+`, which a username can not have.
 */
function parseLink(
  url: null | URL
): { channel: number | string; post: string | undefined } | undefined {
  if (!url || !/^(t|telegram)\.me$/.test(url.hostname)) return undefined
  let invite = /^\/(?:\+|joinchat\/)([\w-]+)\/?$/.exec(url.pathname)
  if (invite) return { channel: `+${invite[1]!}`, post: undefined }
  let match = /^\/(?:c\/(\d+)|(?:s\/)?([a-z]\w{3,31}))(?:\/(\d+))?\/?$/i.exec(
    url.pathname
  )
  if (!match) return undefined
  return {
    channel: match[1] ? -1e12 - Number(match[1]) : match[2]!,
    post: match[3]
  }
}

function checkInvite(name: string, code: string): Promise<TelegramObject> {
  return sendToTelegram(name, {
    '@type': 'checkChatInviteLink',
    'invite_link': `https://t.me/${code}`
  })
}

async function loadChatByKey(
  name: string,
  key: number | string
): Promise<TelegramObject> {
  if (typeof key === 'number') return loadChat(name, key)
  if (!key.startsWith('+')) {
    return sendToTelegram(name, {
      '@type': 'searchPublicChat',
      'username': key
    })
  }
  let invite = await checkInvite(name, key)
  // Telegram shows only the title of a private channel before joining it
  if (!invite.chat_id) throw new TelegramError(403, 'Join the channel first')
  return loadChat(name, Number(invite.chat_id))
}

function getChannelKey(
  url: string,
  loaderData?: null | string
): number | string | undefined {
  let id = readLoaderData(loaderData, 'id')
  return id ? Number(id) : parseLink(URL.parse(url))?.channel
}

/**
 * Without a session here the app can not open Telegram links by itself,
 * so they should go to Telegram’s site.
 */
function hasSession(): boolean {
  return Object.values(deviceSessions.get()).some(i => i.service === 'telegram')
}

async function findChat(
  auth: AccountAuth | undefined,
  url: string,
  loaderData?: null | string
): Promise<{ chat: TelegramObject; name: string }> {
  let key = getChannelKey(url, loaderData)
  async function ask(
    name: string
  ): Promise<{ chat: TelegramObject; name: string }> {
    if (key === undefined) throw new TelegramError(404, 'Not a channel URL')
    return { chat: await loadChatByKey(name, key), name }
  }
  return auth ? ask(getDevice(auth)) : askAnySession(ask)
}

function getChannelId(chat: TelegramObject): unknown {
  let type = chat.type
  return isObject(type) &&
    type['@type'] === 'chatTypeSupergroup' &&
    type.is_channel
    ? type.supergroup_id
    : undefined
}

// TDLib message ID is the post number from t.me links multiplied by it
const MESSAGE_ID_STEP = 1_048_576

function getAlbumId(message: TelegramObject): string | undefined {
  let id = message.media_album_id
  return typeof id === 'string' && id !== '0' ? id : undefined
}

/**
 * Photos of one post come as separate messages with the same album ID.
 */
function groupAlbums(messages: TelegramObject[]): TelegramObject[][] {
  let groups: TelegramObject[][] = []
  for (let message of messages) {
    let last = groups.at(-1)
    let albumId = getAlbumId(message)
    if (last && albumId && getAlbumId(last[0]!) === albumId) {
      last.push(message)
    } else {
      groups.push([message])
    }
  }
  return groups
}

interface TextEntity {
  children: TextEntity[]
  end: number
  start: number
  type: Record<string, unknown>
}

function nestEntities(entities: unknown): TextEntity[] {
  let roots: TextEntity[] = []
  let parents: TextEntity[] = []
  let sorted = (Array.isArray(entities) ? entities : [])
    .filter(isObject)
    .map(entity => ({
      children: [],
      end: Number(entity.offset) + Number(entity.length),
      start: Number(entity.offset),
      type: isObject(entity.type) ? entity.type : {}
    }))
    .toSorted((a, b) => a.start - b.start || b.end - a.end)
  for (let entity of sorted) {
    while (parents.length > 0 && entity.start >= parents.at(-1)!.end) {
      parents.pop()
    }
    let parent = parents.at(-1)
    if (parent && entity.end > parent.end) continue
    ;(parent ? parent.children : roots).push(entity)
    parents.push(entity)
  }
  return roots
}

function escapeText(text: string): string {
  return escapeXml(text).replaceAll('\n', '<br>')
}

function formatInside(
  text: string,
  start: number,
  end: number,
  entities: TextEntity[]
): string {
  let html = ''
  let position = start
  for (let entity of entities) {
    html += escapeText(text.slice(position, entity.start))
    html += formatEntity(text, entity)
    position = entity.end
  }
  return html + escapeText(text.slice(position, end))
}

/**
 * Telegram has several forms of the same link. The app opens in own popups
 * only `https://t.me/` one.
 */
function normalizeLink(href: string): string {
  let url = URL.parse(href)
  if (!url) return href
  let domain = url.searchParams.get('domain')
  if (url.protocol === 'tg:' && url.hostname === 'resolve' && domain) {
    let post = url.searchParams.get('post')
    return `https://t.me/${domain}${post ? `/${post}` : ''}`
  }
  let invite = url.searchParams.get('invite')
  if (url.protocol === 'tg:' && url.hostname === 'join' && invite) {
    return `https://t.me/+${invite}`
  }
  let name = /^([a-z]\w{3,31})\.t\.me$/i.exec(url.hostname)
  if (name) {
    return `https://t.me/${name[1]!}${url.pathname.replace(/^\/$/, '')}`
  }
  if (/^(t|telegram)\.me$/.test(url.hostname)) {
    return `https://t.me${url.pathname}${url.search}${url.hash}`
  }
  return href
}

function formatEntity(text: string, entity: TextEntity): string {
  let raw = text.slice(entity.start, entity.end)
  let inside = formatInside(text, entity.start, entity.end, entity.children)
  let type = String(entity.type['@type']).replace('textEntityType', '')
  let tag = {
    BlockQuote: 'blockquote',
    Bold: 'b',
    Code: 'code',
    ExpandableBlockQuote: 'blockquote',
    Italic: 'i',
    Pre: 'pre',
    PreCode: 'pre',
    Strikethrough: 's',
    Underline: 'u'
  }[type]
  let href = {
    EmailAddress: `mailto:${raw}`,
    Mention: `https://t.me/${raw.slice(1)}`,
    TextUrl: normalizeLink(String(entity.type.url)),
    Url: normalizeLink(/^[a-z][\w+.-]*:/i.test(raw) ? raw : `https://${raw}`)
  }[type]
  if (tag === 'pre') {
    return `<pre>${escapeXml(raw)}</pre>`
  } else if (tag) {
    return `<${tag}>${inside}</${tag}>`
  } else if (href) {
    return `<a href="${escapeXml(href)}">${inside}</a>`
  } else {
    // Hashtag, custom emoji, spoiler, and other entities without HTML tag
    return inside
  }
}

/**
 * TDLib text with entities to HTML. Offsets are in UTF-16 code units,
 * like JS string indexes. Empty line starts a new paragraph.
 */
function formatText(formatted: unknown): string {
  if (!isObject(formatted) || typeof formatted.text !== 'string') return ''
  let text = formatted.text
  let blocks: { html: string; paragraph: boolean }[] = []

  function addInline(html: string): void {
    let last = blocks.at(-1)
    if (last?.paragraph) {
      last.html += html
    } else {
      blocks.push({ html, paragraph: true })
    }
  }

  function addText(from: number, to: number): void {
    text
      .slice(from, to)
      .split(/\n{2,}/)
      .forEach((part, index) => {
        if (index > 0) blocks.push({ html: '', paragraph: true })
        addInline(escapeText(part))
      })
  }

  let position = 0
  for (let entity of nestEntities(formatted.entities)) {
    addText(position, entity.start)
    let html = formatEntity(text, entity)
    if (/^<(pre|blockquote)>/.test(html)) {
      blocks.push({ html, paragraph: false })
    } else {
      addInline(html)
    }
    position = entity.end
  }
  addText(position, text.length)
  return blocks
    .map(block => {
      if (!block.paragraph) return block.html
      let html = block.html.replaceAll(/^(<br>)+|(<br>)+$/g, '')
      return html ? `<p>${html}</p>` : ''
    })
    .join('')
}

function getText(message: TelegramObject): string {
  let content = message.content
  if (!isObject(content)) return ''
  if (isObject(content.text)) return formatText(content.text)
  return formatText(
    isObject(content.poll) ? content.poll.question : content.caption
  )
}

function getPoll(content: Record<string, unknown>): PostPoll | undefined {
  if (!isObject(content.poll) || !Array.isArray(content.poll.options)) {
    return undefined
  }
  return {
    options: content.poll.options.filter(isObject).map(option => ({
      title: isObject(option.text) ? String(option.text.text) : ''
    }))
  }
}

function getPreview(content: Record<string, unknown>): PostPreview | undefined {
  let link = content.link_preview
  if (!isObject(link) || typeof link.url !== 'string') return undefined
  let preview: PostPreview = { url: link.url }
  if (typeof link.title === 'string' && link.title) preview.title = link.title
  if (
    isObject(link.description) &&
    typeof link.description.text === 'string' &&
    link.description.text
  ) {
    preview.description = link.description.text
  }
  // Without image the card with only URL repeats the link from the text
  return preview.title || preview.description ? preview : undefined
}

/**
 * TDLib knows chats and users from the posts, which it already loaded.
 * Forward from a private channel has no source, which we could ask.
 */
async function loadForwardAuthor(
  name: string,
  origin: unknown
): Promise<PostAuthor | undefined> {
  if (!isObject(origin)) return undefined
  if (typeof origin.sender_name === 'string') {
    return { title: origin.sender_name }
  }
  try {
    if (origin.sender_user_id) {
      let user = await sendToTelegram(name, {
        '@type': 'getUser',
        'user_id': origin.sender_user_id
      })
      let username = getUsername(user)
      return {
        ...getAvatar('user', origin.sender_user_id, user.profile_photo),
        title: getUserName(user),
        url: username ? `https://t.me/${username}` : undefined
      }
    }
    let chat = await sendToTelegram(name, {
      '@type': 'getChat',
      'chat_id': origin.chat_id ?? origin.sender_chat_id
    })
    let id = isObject(chat.type) ? chat.type.supergroup_id : undefined
    return {
      ...(id ? getAvatar('channel', id, chat.photo) : undefined),
      title: String(chat.title),
      url: id ? await loadChannelUrl(name, id) : undefined
    }
  } catch (e) {
    if (!TelegramError.is(e)) throw e
    return undefined
  }
}

/**
 * Channels answer to own older posts to continue the story.
 */
async function loadReplied(
  name: string,
  feedUrl: string,
  reply: unknown
): Promise<QuotedPost | undefined> {
  if (!isObject(reply) || reply['@type'] !== 'messageReplyToMessage') {
    return undefined
  }
  try {
    let message = await sendToTelegram(name, {
      '@type': 'getMessage',
      'chat_id': reply.chat_id,
      'message_id': reply.message_id
    })
    return {
      full: getText(message) || undefined,
      missing: false,
      publishedAt: Number(message.date),
      url: `${feedUrl}/${String(Number(message.id) / MESSAGE_ID_STEP)}`
    }
  } catch (e) {
    if (!TelegramError.is(e)) throw e
    return { missing: true }
  }
}

/**
 * Telegram sends a photo in a few sizes, we take the biggest one.
 */
function getLargestSize(photo: unknown): Record<string, unknown> | undefined {
  if (!isObject(photo) || !Array.isArray(photo.sizes)) return undefined
  return photo.sizes
    .filter(isObject)
    .toSorted((a, b) => Number(b.width) - Number(a.width))[0]
}

interface MediaFile {
  id: number
  size: MediaSize
  type: string
}

function toMediaFile(
  file: unknown,
  type: unknown,
  size: Record<string, unknown>
): MediaFile | undefined {
  if (!isObject(file) || typeof type !== 'string') return undefined
  return {
    id: Number(file.id),
    size: {
      bytes: Number(file.size),
      height: Number(size.height ?? size.length),
      width: Number(size.width ?? size.length)
    },
    type
  }
}

/**
 * File of the post by the end of media URL: the media itself, video’s
 * `poster`, or image of link `preview`.
 */
function getMediaFile(
  message: TelegramObject,
  part?: string
): MediaFile | undefined {
  let content = message.content
  if (!isObject(content)) return undefined
  if (part === 'preview') {
    let link = content.link_preview
    let photo = getLargestSize(
      isObject(link) && isObject(link.type) ? link.type.photo : undefined
    )
    return photo && toMediaFile(photo.photo, 'image/jpeg', photo)
  }
  let video = content.video ?? content.animation ?? content.video_note
  if (part === 'poster') {
    let poster = isObject(video) ? video.thumbnail : undefined
    if (!isObject(poster) || !isObject(poster.format)) return undefined
    let format = /^thumbnailFormat(Jpeg|Png|Webp|Gif)$/.exec(
      String(poster.format['@type'])
    )
    return (
      (format &&
        toMediaFile(
          poster.file,
          `image/${format[1]!.toLowerCase()}`,
          poster
        )) ??
      undefined
    )
  }
  let photo = getLargestSize(content.photo)
  if (photo) return toMediaFile(photo.photo, 'image/jpeg', photo)
  if (!isObject(video)) return undefined
  return toMediaFile(
    video.video ?? video.animation,
    video.mime_type ?? 'video/mp4',
    video
  )
}

function toMedia(
  url: string,
  message: TelegramObject
): [PostMedia, MediaSize] | undefined {
  let file = getMediaFile(message)
  if (!file) return undefined
  let content = message.content as Record<string, unknown>
  let media: PostMedia = {
    type: content.animation ? 'video;mode=gif' : file.type.split('/')[0]!,
    url
  }
  if (getMediaFile(message, 'poster')) media.poster = `${url}/poster`
  if (content.has_spoiler) media.sensitive = true
  // Telegram puts a tiny blurred copy of the image into the post itself
  let source =
    content.photo ?? content.video ?? content.animation ?? content.video_note
  let tiny = isObject(source) ? source.minithumbnail : undefined
  if (isObject(tiny) && typeof tiny.data === 'string') {
    media.placeholder = `data:image/jpeg;base64,${tiny.data}`
  }
  return [media, file.size]
}

async function readTelegramFile(
  name: string,
  file: MediaFile,
  bytes: number
): Promise<Response> {
  let session = getSession(name)
  clearTimeout(session.idle)
  try {
    return new Response(await session.client.readFile(file.id, 0, bytes), {
      headers: { 'Content-Type': file.type }
    })
  } finally {
    closeOnIdle(session)
  }
}

async function downloadFile(name: string, file: MediaFile): Promise<Response> {
  let downloaded = await sendToTelegram(name, {
    '@type': 'downloadFile',
    'file_id': file.id,
    'limit': 0,
    'offset': 0,
    'priority': 1,
    'synchronous': true
  })
  let response = await readTelegramFile(name, file, Number(downloaded.size))
  // TDLib keeps downloaded files in memory, and we have own media cache
  await sendToTelegram(name, {
    '@type': 'deleteFile',
    'file_id': file.id
  }).catch(() => {})
  return response
}

function loadMedia(
  chatId: number,
  messageId: number,
  part: string | undefined
): Promise<Response> {
  return askAnySession(async name => {
    await loadChat(name, chatId)
    let file = getMediaFile(
      getSession(name).sponsored.get(`${chatId}/${messageId}`) ??
        (await sendToTelegram(name, {
          '@type': 'getMessage',
          'chat_id': chatId,
          'message_id': messageId
        })),
      part
    )
    if (!file) throw new Error('Telegram post has no such media')
    return downloadFile(name, file)
  })
}

function loadAvatar(user: boolean, id: number): Promise<Response> {
  return askAnySession(async name => {
    let owner = user
      ? await sendToTelegram(name, { '@type': 'getUser', 'user_id': id })
      : await loadChat(name, -1e12 - id)
    let photo = owner.profile_photo ?? owner.photo
    let file = toMediaFile(
      isObject(photo) ? photo.small : undefined,
      'image/jpeg',
      { height: 160, width: 160 }
    )
    if (!file) throw new Error('No Telegram avatar')
    return downloadFile(name, file)
  })
}

/**
 * Messages of one post from the newest one.
 */
async function toPost(
  name: string,
  channel: PostAuthor,
  chatId: number,
  messages: TelegramObject[]
): Promise<ParsedPost | undefined> {
  let first = messages.at(-1)!
  let content = isObject(first.content) ? first.content : {}
  // Like “channel pinned a post”
  if (/^message(Chat|PinMessage|VideoChat)/.test(String(content['@type']))) {
    return undefined
  }
  let post: ParsedPost = {
    // Read position and the next refresh must cover the whole album
    originId: String(Number(messages[0]!.id) / MESSAGE_ID_STEP),
    publishedAt: Number(first.date),
    url: `${channel.url!}/${String(Number(first.id) / MESSAGE_ID_STEP)}`
  }
  let text = messages.map(getText).find(Boolean)
  if (text) post.full = text
  let media = messages
    .toReversed()
    .map(message => {
      return toMedia(
        // Channel ID as in t.me/c/ links
        `telegram:${String(-chatId - 1e12)}/` +
          String(Number(message.id) / MESSAGE_ID_STEP),
        message
      )
    })
    .filter(item => !!item)
  if (media.length > 0) {
    post.media = media.map(([item]) => item)
    post.mediaSizes = media.map(([, size]) => size)
  }
  let edited = Math.max(...messages.map(i => Number(i.edit_date)))
  if (edited) post.updatedAt = edited
  let poll = getPoll(content)
  if (poll) post.poll = poll
  let preview = getPreview(content)
  if (getMediaFile(first, 'preview')) {
    preview = {
      ...preview,
      image:
        `telegram:${String(-chatId - 1e12)}/` +
        `${String(Number(first.id) / MESSAGE_ID_STEP)}/preview`,
      url: String((content.link_preview as Record<string, unknown>).url)
    }
  }
  if (preview) post.preview = preview
  if (!text && !post.media && !poll) post.unsupported = true
  if (messages.some(message => message.can_be_saved === false)) {
    post.protected = true
  }
  if (isObject(first.forward_info)) {
    let author = await loadForwardAuthor(name, first.forward_info.origin)
    if (author) {
      post.author = author
      post.repostedBy = channel
    }
  }
  let replied = await loadReplied(name, channel.url!, first.reply_to)
  if (replied) post.replied = replied
  return post
}

/**
 * All posts of the channel from the newest one. Only Telegram knows,
 * which of them user did not read, so posts under it are marked as `old`.
 */
function loadChannelPosts(
  auth: AccountAuth | undefined,
  url: string,
  loaderData: null | string | undefined
): PostsList {
  let name = ''
  let chatId = 0
  let read = 0
  let loaded = 0
  let channel: PostAuthor = { title: '', url }
  let album: TelegramObject[] = []

  async function loadHistory(from: number): Promise<TelegramObject[]> {
    let history = await sendToTelegram(name, {
      '@type': 'getChatHistory',
      'chat_id': chatId,
      'from_message_id': from,
      'limit': 100,
      'offset': 0,
      'only_local': false
    })
    return (Array.isArray(history.messages) ? history.messages : []).filter(
      isObject
    ) as TelegramObject[]
  }

  async function loadPage(from: number): Promise<PostsListResult> {
    if (from === 0) {
      let found: Awaited<ReturnType<typeof findChat>>
      try {
        found = await findChat(auth, url, loaderData)
      } catch (e) {
        // Preview of a private channel by its invite link
        if (TelegramError.is(e) && e.code === 403) return [[], undefined]
        throw e
      }
      name = found.name
      chatId = Number(found.chat.id)
      read = Number(found.chat.last_read_inbox_message_id)
      channel.title = String(found.chat.title)
      Object.assign(
        channel,
        getAvatar('channel', -chatId - 1e12, found.chat.photo)
      )
    }
    let messages = await loadHistory(from)
    // TDLib’s first answer has only the last post. It is enough for refresh,
    // but too little for feed’s preview.
    if (!auth && from === 0 && messages.length === 1) {
      messages.push(...(await loadHistory(Number(messages[0]!.id))))
    }
    let ended = messages.length === 0
    let albums = groupAlbums([...album, ...messages])
    album = []
    // The oldest album of the page can continue on the next page
    if (!ended && getAlbumId(albums.at(-1)![0]!)) album = albums.pop()!
    let posts = (
      await Promise.all(
        albums.map(group => toPost(name, channel, chatId, group))
      )
    ).filter(post => !!post)
    for (let post of posts) {
      loaded += 1
      // Channel, which was never opened in Telegram, has no read position,
      // and only its latest posts are news
      if (
        Number(post.originId) * MESSAGE_ID_STEP <= read ||
        (read === 0 && loaded > 10)
      ) {
        post.old = true
      }
    }
    return [
      posts,
      ended ? undefined : () => loadPage(Number(messages.at(-1)!.id))
    ]
  }

  return createPostsList(() => loadPage(0))
}

let telegramAccount: AccountLoader<SignInData> = {
  cancelSignIn({ name }) {
    return destroyTelegram(name)
  },

  continueSignIn({ name }, answer) {
    let value = answer.type === 'input' ? answer.value.trim() : ''
    let state = getTelegramAuthState(name)?.['@type']
    if (state === 'authorizationStateWaitPassword') {
      return sendAnswer(name, {
        '@type': 'checkAuthenticationPassword',
        'password': value
      })
    } else if (state === 'authorizationStateWaitEmailCode') {
      return sendAnswer(name, {
        '@type': 'checkAuthenticationEmailCode',
        'code': { '@type': 'emailAddressAuthenticationCode', 'code': value }
      })
    } else {
      return sendAnswer(name, {
        '@type': 'checkAuthenticationCode',
        'code': value
      })
    }
  },

  endDeviceSession(device) {
    return signOutFromTelegram(device)
  },

  firstField: 'phone',

  async follow(auth, url) {
    let key = getChannelKey(url)
    let result =
      typeof key === 'string' && key.startsWith('+')
        ? await sendToTelegram(getDevice(auth), {
            '@type': 'joinChatByInviteLink',
            'invite_link': `https://t.me/${key}`
          })
        : await findChat(auth, url).then(({ chat, name }) => {
            return sendToTelegram(name, {
              '@type': 'joinChat',
              'chat_id': chat.id
            })
          })
    // Join request, which admin must approve, or a check by channel’s bot
    if (/^chatJoinResult(?!Success)/.test(result['@type'])) {
      throw new UserFacingError(t.get().telegramJoinFailed)
    }
  },

  async getFollows(auth) {
    return loadChannels(getDevice(auth))
  },

  async getReadPosts(auth, feed, postOriginIds) {
    let chat = await loadChat(
      getDevice(auth),
      Number(readLoaderData(feed.loaderData, 'id'))
    )
    return postOriginIds.filter(postOriginId => {
      return (
        Number(postOriginId) * MESSAGE_ID_STEP <=
        Number(chat.last_read_inbox_message_id)
      )
    })
  },

  async isFollowing(auth, url) {
    let { chat, name } = await findChat(auth, url)
    let supergroup = await sendToTelegram(name, {
      '@type': 'getSupergroup',
      'supergroup_id': getChannelId(chat)
    })
    return (
      isObject(supergroup.status) &&
      /^chatMemberStatus(Administrator|Creator|Member)$/.test(
        String(supergroup.status['@type'])
      )
    )
  },

  async setReadPosition(auth, feed, postOriginId) {
    let name = getDevice(auth)
    let chatId = Number(readLoaderData(feed.loaderData, 'id'))
    let messageId = Number(postOriginId) * MESSAGE_ID_STEP
    let chat = await loadChat(name, chatId)
    // Read position only grows
    if (messageId <= Number(chat.last_read_inbox_message_id)) return
    await sendToTelegram(name, {
      '@type': 'viewMessages',
      'chat_id': chatId,
      'force_read': true,
      'message_ids': [messageId]
    })
  },

  noAnonymous: true,

  async startSignIn(input) {
    let name = nanoid()
    keepTelegramRunning(name, true)
    try {
      return await sendAnswer(name, {
        '@type': 'setAuthenticationPhoneNumber',
        'phone_number': input.replace(/[^\d+]/g, '')
      })
    } catch (e) {
      await destroyTelegram(name)
      throw e
    }
  },

  async unfollow(auth, url) {
    let { chat, name } = await findChat(auth, url)
    await sendToTelegram(name, { '@type': 'leaveChat', 'chat_id': chat.id })
  }
}

export const telegram: Loader = {
  account: telegramAccount,

  detectFeedInPage() {
    return false
  },

  async getDynamicPosts(url, loaderData, auth) {
    let { chat, name } = await findChat(auth, url, loaderData)
    let chatId = Number(chat.id)
    let answer = await sendToTelegram(name, {
      '@type': 'getChatSponsoredMessages',
      'chat_id': chatId
    })
    let found = Array.isArray(answer.messages)
      ? (answer.messages as unknown[])[0]
      : undefined
    if (!isObject(found) || !isObject(found.sponsor)) return []
    let message: TelegramObject = { ...found, '@type': 'sponsoredMessage' }
    let id = String(found.message_id)
    getSession(name).sponsored.set(`${chatId}/${id}`, message)
    let link = String(found.sponsor.url)
    let post: ParsedPost = {
      dynamic: found.is_recommended ? 'recommended' : 'sponsored',
      full:
        getText(message) +
        `<p><a href="${escapeXml(link)}">` +
        `${escapeText(String(found.button_text))}</a></p>` +
        [found.sponsor.info, found.additional_info]
          .filter(info => typeof info === 'string' && info !== '')
          .map(info => `<p>${escapeText(String(info))}</p>`)
          .join(''),
      originId: id,
      title: String(found.title),
      url: link
    }
    let media = toMedia(
      `telegram:${String(-chatId - 1e12)}/sponsored/${id}`,
      message
    )
    if (media) {
      post.media = [media[0]]
      post.mediaSizes = [media[1]]
    }
    return [post]
  },

  async getLoaderData(task, url) {
    let { chat } = await findChat(undefined, url)
    return JSON.stringify({ id: String(chat.id) })
  },

  getMedia(url) {
    let avatar = /^telegram:(user\/)?(\d+)\/avatar\/[\w-]*$/.exec(url)
    if (avatar) return loadAvatar(!!avatar[1], Number(avatar[2]))
    let match =
      /^telegram:(\d+)\/(sponsored\/)?(\d+)(?:\/(poster|preview))?$/.exec(url)
    return match
      ? loadMedia(
          -1e12 - Number(match[1]),
          // Ads have own IDs outside of post numbers
          Number(match[3]) * (match[2] ? 1 : MESSAGE_ID_STEP),
          match[4]
        )
      : undefined
  },

  getMineLinksFromText() {
    return []
  },

  getOriginId(loaderData) {
    return readLoaderData(loaderData, 'id')
  },

  async getPostByUrl(task, url) {
    let { chat, name } = await findChat(undefined, url)
    let chatId = Number(chat.id)
    let id = getChannelId(chat)
    if (id === undefined) throw new NotFoundError()
    let channel: PostAuthor = {
      title: String(chat.title),
      url: await loadChannelUrl(name, id),
      ...getAvatar('channel', id, chat.photo)
    }
    let post = await toPost(name, channel, chatId, [
      await sendToTelegram(name, {
        '@type': 'getMessage',
        'chat_id': chatId,
        'message_id': Number(parseLink(URL.parse(url))!.post) * MESSAGE_ID_STEP
      })
    ])
    if (!post) throw new NotFoundError()
    return { author: channel, ...post, id: url }
  },

  getPosts(task, url, text, refreshedAt, loaderData, auth) {
    return loadChannelPosts(auth, url, loaderData)
  },

  getProfilesByHandle(task, handle) {
    let match = /^@([a-z]\w{3,31})$/i.exec(handle)
    return Promise.resolve(
      match && hasSession() ? [`https://t.me/${match[1]!}`] : []
    )
  },

  getPostSource() {
    return Promise.resolve(undefined)
  },

  getSuggestedLinksFromText() {
    return []
  },

  isFinalUnfollow(url) {
    return typeof getChannelKey(url) === 'number'
  },

  isMineUrl(task, url) {
    let link = parseLink(url)
    if (!link) return false
    return askAnySession(async (name): Promise<DetectedFeed | false> => {
      let key = link.channel
      if (typeof key === 'string' && key.startsWith('+')) {
        let invite = await checkInvite(name, key)
        if (
          !isObject(invite.type) ||
          invite.type['@type'] !== 'inviteLinkChatTypeChannel'
        ) {
          return false
        }
        if (!invite.chat_id) {
          return { title: String(invite.title), url: `https://t.me/${key}` }
        }
      }
      let chat = await loadChatByKey(name, key)
      let id = getChannelId(chat)
      if (id === undefined) return false
      return { title: String(chat.title), url: await loadChannelUrl(name, id) }
    }).catch((e: unknown) => {
      // No session here, unknown name, or channel of another account.
      // Other errors, like flood limit, must be visible to the user.
      if (TelegramError.is(e) && [400, 401, 404].includes(e.code)) {
        return false
      }
      throw e
    })
  },

  isPostUrl(url) {
    return hasSession() && !!parseLink(url)?.post
  },

  isProfileUrl(url) {
    let link = parseLink(url)
    return hasSession() && !!link && !link.post
  },

  async loadFeedData(task, url) {
    let { chat } = await findChat(undefined, url)
    return {
      ...getAvatar('channel', -Number(chat.id) - 1e12, chat.photo),
      title: String(chat.title),
      url
    }
  }
}
