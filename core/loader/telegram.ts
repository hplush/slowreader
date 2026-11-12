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
import { TelegramError, UserFacingError } from '../errors.ts'
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

async function loadAccount(
  name: string
): Promise<Extract<SignInStep<SignInData>, { type: 'done' }>> {
  let user = await sendToTelegram(name, { '@type': 'getMe' })
  let username = getUsername(user)
  let title = getUserName(user)
  return {
    account: {
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
      let type = chat.type
      if (
        !isObject(type) ||
        type['@type'] !== 'chatTypeSupergroup' ||
        !type.is_channel
      ) {
        return undefined
      }
      return {
        // Channel can change the username, but not the ID
        loaderData: JSON.stringify({ id: String(chat.id) }),
        title: String(chat.title),
        url: await loadChannelUrl(name, type.supergroup_id)
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
    TextUrl: String(entity.type.url),
    Url: /^[a-z][\w+.-]*:/i.test(raw) ? raw : `https://${raw}`
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
        title: getUserName(user),
        url: username ? `https://t.me/${username}` : undefined
      }
    }
    let chat = await sendToTelegram(name, {
      '@type': 'getChat',
      'chat_id': origin.chat_id ?? origin.sender_chat_id
    })
    return {
      title: String(chat.title),
      url:
        isObject(chat.type) && chat.type.supergroup_id
          ? await loadChannelUrl(name, chat.type.supergroup_id)
          : undefined
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
  // Telegram forbids to save or copy posts of protected channels
  if (!isObject(content) || message.can_be_saved === false) return undefined
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
  chatId: number,
  message: TelegramObject
): [PostMedia, MediaSize] | undefined {
  let file = getMediaFile(message)
  if (!file) return undefined
  let content = message.content as Record<string, unknown>
  // Channel ID as in t.me/c/ links
  let url =
    `telegram:${String(-chatId - 1e12)}/` +
    String(Number(message.id) / MESSAGE_ID_STEP)
  let media: PostMedia = {
    type: content.animation ? 'video;mode=gif' : file.type.split('/')[0]!,
    url
  }
  if (getMediaFile(message, 'poster')) media.poster = `${url}/poster`
  if (content.has_spoiler) media.sensitive = true
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

/**
 * Media URL has no account, so we try every Telegram session of this device.
 */
async function loadMedia(
  chatId: number,
  messageId: number,
  part: string | undefined
): Promise<Response> {
  let error: unknown = new Error('No Telegram session on this device')
  for (let { device, service } of Object.values(deviceSessions.get())) {
    if (service !== 'telegram') continue
    try {
      await loadChat(device, chatId)
      let file = getMediaFile(
        await sendToTelegram(device, {
          '@type': 'getMessage',
          'chat_id': chatId,
          'message_id': messageId
        }),
        part
      )
      if (!file) throw new Error('Telegram post has no such media')
      let downloaded = await sendToTelegram(device, {
        '@type': 'downloadFile',
        'file_id': file.id,
        'limit': 0,
        'offset': 0,
        'priority': 1,
        'synchronous': true
      })
      let response = await readTelegramFile(
        device,
        file,
        Number(downloaded.size)
      )
      // TDLib keeps downloaded files in memory, and we have own media cache
      await sendToTelegram(device, {
        '@type': 'deleteFile',
        'file_id': file.id
      }).catch(() => {})
      return response
    } catch (e) {
      if (!TelegramError.is(e)) throw e
      error = e
    }
  }
  throw error
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
    .map(message => toMedia(chatId, message))
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
  auth: AccountAuth,
  url: string,
  loaderData: null | string | undefined
): PostsList {
  let chatId = Number(readLoaderData(loaderData, 'id'))
  let read = 0
  let loaded = 0
  let channel: PostAuthor = { title: '', url }
  let album: TelegramObject[] = []

  async function loadPage(from: number): Promise<PostsListResult> {
    let name = getDevice(auth)
    if (from === 0) {
      let chat = await loadChat(name, chatId)
      read = Number(chat.last_read_inbox_message_id)
      channel.title = String(chat.title)
    }
    // The first answer has only the last post, TDLib chooses the size itself
    let history = await sendToTelegram(name, {
      '@type': 'getChatHistory',
      'chat_id': chatId,
      'from_message_id': from,
      'limit': 100,
      'offset': 0,
      'only_local': false
    })
    let messages = (
      Array.isArray(history.messages) ? history.messages : []
    ).filter(isObject) as TelegramObject[]
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

  continueSignIn(task, { name }, answer) {
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

  follow() {
    return Promise.reject(new Error('Telegram follow is not ready'))
  },

  async getFollows(task, auth) {
    return loadChannels(getDevice(auth))
  },

  getTimeline() {
    return createPostsList(() => Promise.resolve([[], undefined]))
  },

  isFollowing() {
    return Promise.resolve(false)
  },

  noTimeline: true,

  async startSignIn(task, input) {
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

  unfollow() {
    return Promise.reject(new Error('Telegram unfollow is not ready'))
  }
}

export const telegram: Loader = {
  account: telegramAccount,

  detectFeedInPage() {
    return false
  },

  getMedia(url) {
    let match = /^telegram:(\d+)\/(\d+)(?:\/(poster|preview))?$/.exec(url)
    return match
      ? loadMedia(
          -1e12 - Number(match[1]),
          Number(match[2]) * MESSAGE_ID_STEP,
          match[3]
        )
      : undefined
  },

  getMineLinksFromText() {
    return []
  },

  getOriginId(loaderData) {
    return readLoaderData(loaderData, 'id')
  },

  getPosts(task, url, text, refreshedAt, loaderData, auth) {
    return auth
      ? loadChannelPosts(auth, url, loaderData)
      : createPostsList(() => Promise.resolve([[], undefined]))
  },

  getPostSource() {
    return Promise.resolve(undefined)
  },

  getSuggestedLinksFromText() {
    return []
  },

  isMineUrl() {
    return false
  },

  loadFeedData() {
    return Promise.resolve(undefined)
  }
}
