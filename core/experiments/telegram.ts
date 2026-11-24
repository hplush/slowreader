import { getEnvironment } from '../environment.ts'
import { isObject, type Urgency } from '../loader/common.ts'
import {
  sendToTelegram,
  type TelegramTrace,
  traceTelegram
} from '../loader/telegram.ts'
import type { Experiment, ExperimentRecords } from './common.ts'

interface Stat {
  count: number
  max: number
  total: number
}

interface Around {
  at: string
  connection: string
  flight: Record<string, number>
  log: Record<string, number>
  online: boolean
  sockets: Record<string, number>
  visible: boolean
}

type Finish = { end: string; open: false; took: number } | { open: true }

type StuckRequest = Around &
  Finish & {
    bytes: [number, number] | undefined
    kind: string
    priority: number | undefined
    type: 'stuckRequest'
    urgency: Urgency
  }

type SlowMedia = Around &
  Finish & {
    chatLists: number
    kind: string
    steps: Record<string, number>
    type: 'slowMedia'
    unknownChat: number
    urgency: Urgency
  }

type Case = SlowMedia | StuckRequest

interface Total {
  account: Record<string, unknown>
  connects: Record<string, Stat>
  downloads: Record<string, Stat>
  errors: Record<string, number>
  lanes: Record<string, Stat>
  log: Record<string, number>
  logNumbers: Record<string, Stat>
  media: Record<string, Stat>
  memory: Record<string, number>
  network: number
  parts: Record<string, number>
  photos: Record<string, Stat>
  pushes: Record<string, number>
  requests: Record<string, Stat>
  since: string
  sockets: Record<string, number>
  starts: Record<string, Stat>
  type: 'total'
  version: 2
}

interface Media {
  asked: number
  chat: number | undefined
  chatAt: number | undefined
  kind: string
  lists: number
  looked: boolean
  message: number | undefined
  misses: number
  postAt: number | undefined
  slow: SlowMedia | undefined
  timer: ReturnType<typeof setTimeout>
  urgency: Urgency
  user: number | undefined
}

interface Pending {
  bytes: [number, number] | undefined
  chat: number | undefined
  file: number | undefined
  kind: string
  message: number | undefined
  priority: number | undefined
  queued: number
  sent: number | undefined
  stuck: StuckRequest | undefined
  timer: ReturnType<typeof setTimeout>
  urgency: Urgency
  user: number | undefined
}

function add(stats: Record<string, Stat>, key: string, value: number): void {
  let stat = (stats[key] ??= { count: 0, max: 0, total: 0 })
  stat.count += 1
  stat.total += value
  stat.max = Math.max(stat.max, value)
}

function count(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1
}

// TDLib log has chat IDs and addresses, so we keep only the kind of the line,
// Telegram’s ID of the method from `tl:0x…`, and one number: seconds
// of the delay or count of lost requests.
const LOG: [string, RegExp][] = [
  [
    'flood',
    /Delay: .*?\[tl:0x(?<method>\w+).*\[timeout:(?<number>\d+).*FLOOD_/
  ],
  ['hiddenRetry', /Delay: .*?\[tl:0x(?<method>\w+).*\[timeout:(?<number>\d+)/],
  ['gaveUp', /Failed: .*?\[tl:0x(?<method>\w+).*\[timeout:(?<number>\d+)/],
  ['pingTimeout', /with (?<number>\d+) pending requests was closed: .*Ping t/],
  ['readTimeout', /with (?<number>\d+) pending requests was closed: .*Read t/],
  ['noAnswer', /with (?<number>\d+) pending requests was closed: .*No answer/],
  ['closed', /with (?<number>\d+) pending requests was closed/],
  ['connectFailed', /Failed connection/],
  ['connected', /Ready connection/],
  ['referenceExpired', /FILE_REFERENCE_EXPIRED/],
  ['referenceRepair', /Send file reference repair query/],
  ['newSession', /Generate new session_id/],
  ['handshakeFailed', /Handshake failed/],
  ['otherDataCenter', /Send exportAuthorization/],
  ['sentPosts', /Send query to connection .*tl:0xad8c9a23/],
  ['sentChannelNews', /Send query to connection .*tl:0x03173d78/]
]

function isTotal(value: unknown): value is Total {
  return isObject(value) && value.type === 'total' && value.version === 2
}

function isCase(value: unknown): value is Case {
  return (
    isObject(value) &&
    (value.type === 'slowMedia' || value.type === 'stuckRequest')
  )
}

function toId(value: unknown): number | undefined {
  return value === undefined ? undefined : Number(value)
}

function collect(records: ExperimentRecords): () => void {
  let saved = records.loadRecords()
  let total: Total = saved.find(isTotal) ?? {
    account: {},
    connects: {},
    downloads: {},
    errors: {},
    lanes: {},
    log: {},
    logNumbers: {},
    media: {},
    memory: {},
    network: -1,
    parts: {},
    photos: {},
    pushes: {},
    requests: {},
    since: new Date().toISOString(),
    sockets: {},
    starts: {},
    type: 'total',
    version: 2
  }
  let cases = saved.filter(isCase)
  let pending = new Map<number, Pending>()
  let medias = new Map<number, Media>()
  let parts = new Map<string, { sent: number; session: string }>()
  let watched = new Set<Case>()
  let connection = 'Unknown'
  let online = false
  let visible = true
  let started: number | undefined
  let saving: ReturnType<typeof setTimeout> | undefined

  function save(): void {
    saving ??= setTimeout(() => {
      saving = undefined
      records.setRecords([total, ...cases])
    }, 5000)
  }

  /**
   * Counters of the same thing with and without the “Telegram online”
   * experiment, to compare them in one record.
   */
  function mode(key: string): string {
    return online ? `online ${key}` : key
  }

  function lookAround(): Around {
    let flight: Record<string, number> = {}
    for (let request of pending.values()) count(flight, request.kind)
    for (let media of medias.values()) count(flight, `image ${media.urgency}`)
    return {
      at: new Date().toISOString(),
      connection,
      flight,
      log: {},
      online,
      sockets: {},
      visible
    }
  }

  function open<Opened extends Case>(opened: Opened): Opened {
    watched.add(opened)
    cases.push(opened)
    if (cases.length > 200) cases.shift()
    save()
    return opened
  }

  function close(opened: Case, closed: Case): void {
    watched.delete(opened)
    let index = cases.indexOf(opened)
    if (index !== -1) cases[index] = closed
  }

  function watch(id: number): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      let request = pending.get(id)!
      request.stuck ??= open({
        ...lookAround(),
        bytes: request.bytes,
        kind: request.kind,
        open: true,
        priority: request.priority,
        type: 'stuckRequest',
        urgency: request.urgency
      })
    }, 10_000)
  }

  function finish(id: number, end: string): void {
    let request = pending.get(id)
    if (!request) return
    let now = Date.now()
    pending.delete(id)
    clearTimeout(request.timer)
    if (request.sent) {
      add(total.requests, request.kind, now - request.sent)
      if (now - request.sent < 10) count(total.memory, request.kind)
    }
    if (end !== 'answer') {
      count(total.errors, `${request.kind} ${end.replace(/\d+/g, 'N')}`)
    }
    for (let media of medias.values()) {
      if (request.kind === 'loadChats') {
        if (media.looked && !media.chatAt) media.lists += 1
      } else if (
        (request.kind === 'getChat' && request.chat === media.chat) ||
        (request.kind === 'getUser' && request.user === media.user)
      ) {
        if (end !== 'answer') {
          media.misses += 1
        } else {
          media.chatAt ??= now
        }
      } else if (
        end === 'answer' &&
        request.kind === 'getMessage' &&
        request.chat === media.chat &&
        request.message === media.message
      ) {
        media.postAt ??= now
      }
    }
    if (request.stuck) {
      close(request.stuck, {
        ...request.stuck,
        end,
        open: false,
        took: now - request.queued
      })
    }
  }

  function askMedia(id: number, url: string, urgency: Urgency): void {
    let avatar = /^telegram:(user\/)?(\d+)\/avatar\//.exec(url)
    let file = /^telegram:(\d+)\/(sponsored\/)?(\d+)/.exec(url)
    if (!avatar && !file) return
    let channel = avatar?.[1] ? undefined : (avatar?.[2] ?? file?.[1])
    medias.set(id, {
      asked: Date.now(),
      chat: channel ? -1e12 - Number(channel) : undefined,
      chatAt: undefined,
      kind: avatar ? 'avatar' : 'file',
      lists: 0,
      looked: false,
      message: file && !file[2] ? Number(file[3]) * 1_048_576 : undefined,
      misses: 0,
      postAt: undefined,
      slow: undefined,
      timer: setTimeout(
        () => {
          let media = medias.get(id)!
          media.slow = open({
            ...lookAround(),
            chatLists: media.lists,
            kind: media.kind,
            open: true,
            steps: {},
            type: 'slowMedia',
            unknownChat: media.misses,
            urgency
          })
        },
        urgency === 'later' ? 30_000 : 5000
      ),
      urgency,
      user: avatar?.[1] ? Number(avatar[2]) : undefined
    })
  }

  function finishMedia(id: number, end: string): void {
    let media = medias.get(id)
    if (!media) return
    let now = Date.now()
    medias.delete(id)
    clearTimeout(media.timer)
    add(total.media, mode(media.urgency), now - media.asked)
    if (!media.slow) return
    let steps: Record<string, number> = {}
    if (!media.looked) {
      steps.file = now - media.asked
    } else if (!media.chatAt) {
      steps.chat = now - media.asked
    } else if (!media.postAt) {
      steps.chat = media.chatAt - media.asked
      steps.file = now - media.chatAt
    } else {
      steps.chat = media.chatAt - media.asked
      steps.post = media.postAt - media.chatAt
      steps.file = now - media.postAt
    }
    close(media.slow, {
      ...media.slow,
      chatLists: media.lists,
      end,
      open: false,
      steps,
      took: now - media.asked,
      unknownChat: media.misses
    })
  }

  function prepare(session: string): void {
    sendToTelegram(session, {
      '@type': 'setLogVerbosityLevel',
      'new_verbosity_level': 2
    }).catch(() => {})
    for (let tag of ['connections', 'file_references', 'net_query', 'dc']) {
      sendToTelegram(session, {
        '@type': 'setLogTagVerbosityLevel',
        'new_verbosity_level': 2,
        tag
      }).catch(() => {})
    }
  }

  function askAccount(session: string): void {
    for (let name of ['is_premium', 'session_count']) {
      sendToTelegram(session, { '@type': 'getOption', name }).then(
        option => {
          total.account[name] = option.value
        },
        () => {}
      )
    }
  }

  function trackUpdate(session: string, update: Record<string, unknown>): void {
    let now = Date.now()
    let type = update['@type']
    if (type === 'updateFile') {
      let file = update.file
      if (!isObject(file) || !isObject(file.local)) return
      let done = Number(file.local.downloaded_size)
      for (let [id, request] of pending) {
        if (request.file !== file.id || !request.sent) continue
        if (!request.bytes && done > 0) {
          add(total.downloads, mode('firstByte'), now - request.sent)
        }
        if (done > 0) {
          request.bytes = [
            done,
            Number(file.size) || Number(file.expected_size)
          ]
        }
        clearTimeout(request.timer)
        request.timer = watch(id)
      }
    } else if (type === 'updateConnectionState' && isObject(update.state)) {
      connection = String(update.state['@type']).replace('connectionState', '')
    } else if (
      type === 'updateAuthorizationState' &&
      isObject(update.authorization_state)
    ) {
      let state = update.authorization_state['@type']
      if (state === 'authorizationStateWaitTdlibParameters') {
        started = now
        online = false
        prepare(session)
      } else if (state === 'authorizationStateReady' && started) {
        add(total.starts, 'ready', now - started)
        started = undefined
        askAccount(session)
      }
    } else if (
      type === 'updateNewMessage' &&
      isObject(update.message) &&
      update.message.is_channel_post
    ) {
      let late = now / 1000 - Number(update.message.date)
      let delay = 'more'
      if (late < 10) {
        delay = '10s'
      } else if (late < 60) {
        delay = '1m'
      } else if (late < 600) {
        delay = '10m'
      }
      count(total.pushes, delay)
    }
  }

  /**
   * Answer time of every file part by data center and kind of the connection.
   */
  function trackPart(line: string, now: number): string | undefined {
    let query = /Query:\[id:(\d+)\]\[tl:0xbe5335be\]/.exec(line)?.[1]
    if (!query) return undefined
    let part = parts.get(query)
    if (line.includes('Send query to connection')) {
      let session = /\[!Session:(\d+:\w+)/.exec(line)?.[1] ?? 'unknown'
      if (part) count(total.parts, mode(`${session} sentAgain`))
      if (parts.size > 5000) parts.clear()
      parts.set(query, { sent: now, session })
      return 'sentPart'
    } else if (part && line.includes('Return query')) {
      parts.delete(query)
      let took = now - part.sent
      let time = 'more'
      if (took < 1000) {
        time = '1s'
      } else if (took < 10_000) {
        time = '10s'
      } else if (took < 35_000) {
        time = '35s'
      } else if (took < 65_000) {
        time = '65s'
      } else if (took < 95_000) {
        time = '95s'
      }
      count(total.parts, mode(`${part.session} ${time}`))
      return 'answeredPart'
    }
    return undefined
  }

  function trackLog(line: string, now: number): string | undefined {
    let part = trackPart(line, now)
    if (part) return part
    for (let [name, pattern] of LOG) {
      let match = pattern.exec(line)
      if (!match) continue
      let found = match.groups
      let kind = found?.method ? `${name} ${found.method}` : name
      if (found?.number) add(total.logNumbers, kind, Number(found.number))
      return kind
    }
    let prefix = line.split('\t')[0]!
    // Lines of the tags, which we asked for, are not a sign of a problem
    if (prefix.includes('[&')) return undefined
    let place = /^\[ ?[012]\].*\[(\w+\.\w+:\d+)\]/.exec(prefix)?.[1]
    return place ? `other ${place}` : undefined
  }

  function trackPhoto(answer: Record<string, unknown>): void {
    let content = answer.content
    let photo = isObject(content) ? content.photo : undefined
    if (!isObject(photo) || !Array.isArray(photo.sizes)) return
    let widest = 0
    for (let size of photo.sizes) {
      if (!isObject(size) || !isObject(size.photo)) continue
      widest = Math.max(widest, Number(size.width))
      add(
        total.photos,
        String(size.type),
        Number(size.photo.size) || Number(size.photo.expected_size)
      )
    }
    add(total.photos, 'widest', widest)
  }

  let untrace = traceTelegram((event: TelegramTrace) => {
    let now = Date.now()
    if (event.type === 'queued') {
      let request = event.request
      let download = request['@type'] === 'downloadFile'
      // Video player asks for a part of the file and gets the whole file size
      let kind = download && request.limit ? 'downloadRange' : request['@type']
      let asked: Pending = {
        bytes: undefined,
        chat: toId(request.chat_id),
        file:
          download && request.synchronous ? Number(request.file_id) : undefined,
        kind,
        message: toId(request.message_id),
        priority: download ? Number(request.priority) : undefined,
        queued: now,
        sent: undefined,
        stuck: undefined,
        timer: watch(event.id),
        urgency: event.urgency,
        user: toId(request.user_id)
      }
      pending.set(event.id, asked)
      if (kind === 'setOption' && request.name === 'online') {
        online = isObject(request.value) && request.value.value === true
      }
      for (let media of medias.values()) {
        if (
          (kind === 'getChat' && asked.chat === media.chat) ||
          (kind === 'getUser' && asked.user === media.user)
        ) {
          media.looked = true
        }
      }
    } else if (event.type === 'sent') {
      let request = pending.get(event.id)
      if (!request) return
      request.sent = now
      add(total.lanes, request.urgency, now - request.queued)
    } else if (event.type === 'answered') {
      let request = pending.get(event.id)
      if (request?.kind === 'downloadFile' && request.file && request.sent) {
        add(total.downloads, mode('whole'), now - request.sent)
        add(total.downloads, 'bytes', Number(event.answer.size))
        add(
          total.downloads,
          mode(`priority${request.priority}`),
          now - request.sent
        )
      }
      if (event.answer['@type'] === 'message') trackPhoto(event.answer)
      finish(event.id, 'answer')
    } else if (event.type === 'failed' || event.type === 'mediaFailed') {
      let error = event.error
      let end =
        error instanceof Error
          ? `${error.name} ${error.message}`.slice(0, 80)
          : 'unknown'
      if (event.type === 'failed') {
        finish(event.id, end)
      } else {
        finishMedia(event.id, end)
      }
    } else if (event.type === 'mediaAsked') {
      askMedia(event.id, event.url, event.urgency)
    } else if (event.type === 'mediaLoaded') {
      finishMedia(event.id, 'answer')
    } else if (event.type === 'update') {
      trackUpdate(event.session, event.update)
    } else {
      let debug = event.debug
      let kind: string | undefined
      if (debug.type === 'log') {
        kind = trackLog(debug.line, now)
        if (kind) count(total.log, kind)
      } else if (debug.type === 'socketOpened') {
        kind = 'opened'
        add(total.connects, debug.host, debug.waited)
      } else {
        kind = debug.clean ? 'closed' : 'dropped'
      }
      if (kind) {
        if (debug.type !== 'log') count(total.sockets, kind)
        for (let item of watched) {
          count(debug.type === 'log' ? item.log : item.sockets, kind)
        }
      }
    }
    save()
  })

  let unbindVisibility = getEnvironment().onVisibilityChange(value => {
    visible = value
  })
  let unbindNetwork = getEnvironment().onNetwork(() => {
    total.network += 1
  })

  return () => {
    untrace()
    unbindVisibility()
    unbindNetwork()
    clearTimeout(saving)
    for (let request of pending.values()) clearTimeout(request.timer)
    for (let media of medias.values()) clearTimeout(media.timer)
  }
}

export const telegram: Experiment = {
  autostart: false,
  collects: true,
  description:
    'Saves timings of Telegram requests and downloads on this device ' +
    'to find why images hang. No chat names, IDs, or texts.',
  hidden: false,
  name: 'telegram',
  onStart: collect,
  sending: false,
  title: 'Telegram media'
}
