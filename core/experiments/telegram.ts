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

type Step = 'chat' | 'loading' | 'moving' | 'post' | 'slots' | 'waiting'

/**
 * File, which was not ready in time, and where it spent that time.
 * It has no chat names, IDs, or texts.
 */
interface Stall {
  at: string
  bytes: number | undefined
  /**
   * The longest step.
   */
  cause: Step | undefined
  chatLists: number
  connection: string
  /**
   * `undefined` for a file, which still waits.
   */
  end: string | undefined
  /**
   * Other files, which TDLib was downloading, when the stall was noticed.
   */
  holders: { bytes: number; loading: number; urgency: Urgency | undefined }[]
  kind: 'avatar' | 'file'
  /**
   * Kinds of TDLib log lines during the stall.
   */
  log: Record<string, number>
  networks: number
  online: boolean
  premium: boolean | undefined
  /**
   * Milliseconds from asking and downloaded bytes.
   */
  progress: [number, number][]
  retried: boolean
  steps: Partial<Record<Step, number>>
  took: number | undefined
  type: 'stall'
  unknownChat: number
  urgency: Urgency
  visible: boolean
  window: number | undefined
}

interface Total {
  causes: Record<string, number>
  errors: Record<string, number>
  log: Record<string, number>
  logNumbers: Record<string, Stat>
  media: Record<string, Stat>
  premium: boolean | undefined
  since: string
  steps: Record<string, Stat>
  type: 'total'
  version: 3
}

interface Media {
  asked: number
  bytes: number | undefined
  chat: number | undefined
  chatAt: number | undefined
  file: number | undefined
  joined: number | undefined
  kind: 'avatar' | 'file'
  lists: number
  loadingAt: number | undefined
  /**
   * Kinds of requests, which already look for the chat or the post
   * of this file. Other files of the same chat send own requests.
   */
  lookups: Set<string>
  message: number | undefined
  misses: number
  movingAt: number | undefined
  postAt: number | undefined
  progress: [number, number][]
  retried: boolean
  slots: number
  stall: Stall | undefined
  timer: ReturnType<typeof setTimeout>
  url: string
  urgency: Urgency
  user: number | undefined
  window: number | undefined
}

interface Lookup {
  kind: string
  media: Media | undefined
  queued: number
}

interface Loading {
  bytes: number
  since: number
  step: 'loading' | 'moving' | 'waiting'
  urgency: Urgency | undefined
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
// of the delay or count of lost requests. `be5335be` is a part of a file.
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
  ['newSession', /Generate new session_id/]
]

function isTotal(value: unknown): value is Total {
  return isObject(value) && value.type === 'total' && value.version === 3
}

function isStall(value: unknown): value is Stall {
  return isObject(value) && value.type === 'stall'
}

function isLookupOf(request: Record<string, unknown>, media: Media): boolean {
  let kind = request['@type']
  if (kind === 'getChat') return request.chat_id === media.chat
  if (kind === 'getUser') return request.user_id === media.user
  return (
    kind === 'getMessage' &&
    request.chat_id === media.chat &&
    request.message_id === media.message
  )
}

function collect(records: ExperimentRecords): () => void {
  let saved = records.loadRecords()
  let total: Total = saved.find(isTotal) ?? {
    causes: {},
    errors: {},
    log: {},
    logNumbers: {},
    media: {},
    premium: undefined,
    since: new Date().toISOString(),
    steps: {},
    type: 'total',
    version: 3
  }
  let stalls = saved.filter(isStall)
  let lookups = new Map<number, Lookup>()
  let medias = new Map<number, Media>()
  let loadings = new Map<number, Loading>()
  let failed = new Map<string, number>()
  let connection = 'Unknown'
  let online = false
  let visible = true
  let saving: ReturnType<typeof setTimeout> | undefined

  function save(): void {
    saving ??= setTimeout(() => {
      saving = undefined
      records.setRecords([total, ...stalls])
    }, 5000)
  }

  /**
   * Counters of accounts with and without Premium in one record.
   */
  function mode(window: number | undefined, key: string): string {
    return window ? `${window / 1024 / 1024}MB ${key}` : `none ${key}`
  }

  function getSteps(media: Media, now: number): Partial<Record<Step, number>> {
    let steps: Partial<Record<Step, number>> = {}
    let found = media.joined ?? now
    let chatAt = media.asked
    if (media.slots > 0) steps.slots = media.slots
    if (media.lookups.has('getChat') || media.lookups.has('getUser')) {
      chatAt = media.chatAt ?? found
      steps.chat = chatAt - media.asked
    }
    if (media.lookups.has('getMessage')) {
      steps.post = (media.postAt ?? found) - chatAt
    }
    if (media.joined) {
      let loadingAt = media.loadingAt ?? now
      let movingAt = media.movingAt ?? now
      steps.waiting = loadingAt - media.joined
      if (media.loadingAt) steps.loading = movingAt - loadingAt
      if (media.movingAt) steps.moving = now - movingAt
    }
    return steps
  }

  function findCause(steps: Partial<Record<Step, number>>): Step | undefined {
    let cause: Step | undefined
    for (let [step, time] of Object.entries(steps) as [Step, number][]) {
      // Waiting for a slot is a part of the search of the chat or of the post
      if (step !== 'slots' && time > (cause ? steps[cause]! : 0)) cause = step
    }
    if (
      (cause === 'chat' || cause === 'post') &&
      (steps.slots ?? 0) > steps[cause]! / 2
    ) {
      return 'slots'
    }
    return cause
  }

  function describe(media: Media, now: number): Stall {
    let steps = getSteps(media, now)
    return {
      at: new Date(media.asked).toISOString(),
      bytes: media.bytes,
      cause: findCause(steps),
      chatLists: media.lists,
      connection,
      end: undefined,
      holders: [...loadings]
        .filter(([file, loading]) => {
          return file !== media.file && loading.step === 'loading'
        })
        .slice(0, 30)
        .map(([, loading]) => {
          return {
            bytes: loading.bytes,
            loading: now - loading.since,
            urgency: loading.urgency
          }
        }),
      kind: media.kind,
      log: {},
      networks: 0,
      online,
      premium: total.premium,
      progress: media.progress,
      retried: media.retried,
      steps,
      took: undefined,
      type: 'stall',
      unknownChat: media.misses,
      urgency: media.urgency,
      visible,
      window: media.window
    }
  }

  function askMedia(id: number, url: string, urgency: Urgency): void {
    let avatar = /^telegram:(user\/)?(\d+)\/avatar\//.exec(url)
    let file = /^telegram:(\d+)\/(sponsored\/)?(\d+)/.exec(url)
    if (!avatar && !file) return
    let now = Date.now()
    let channel = avatar?.[1] ? undefined : (avatar?.[2] ?? file?.[1])
    let retried = now - (failed.get(url) ?? 0) < 1000
    failed.delete(url)
    medias.set(id, {
      asked: now,
      bytes: undefined,
      chat: channel ? -1e12 - Number(channel) : undefined,
      chatAt: undefined,
      file: undefined,
      joined: undefined,
      kind: avatar ? 'avatar' : 'file',
      lists: 0,
      loadingAt: undefined,
      lookups: new Set(),
      message: file && !file[2] ? Number(file[3]) * 1_048_576 : undefined,
      misses: 0,
      movingAt: undefined,
      postAt: undefined,
      progress: [],
      retried,
      slots: 0,
      stall: undefined,
      timer: setTimeout(
        () => {
          let media = medias.get(id)!
          media.stall = describe(media, Date.now())
          stalls.push(media.stall)
          if (stalls.length > 100) stalls.shift()
          save()
        },
        urgency === 'later' ? 30_000 : 5000
      ),
      url,
      urgency,
      user: avatar?.[1] ? Number(avatar[2]) : undefined,
      window: undefined
    })
  }

  function finishMedia(id: number, end: string): void {
    let media = medias.get(id)
    if (!media) return
    let now = Date.now()
    medias.delete(id)
    clearTimeout(media.timer)
    let steps = getSteps(media, now)
    add(total.media, mode(media.window, media.urgency), now - media.asked)
    for (let [step, time] of Object.entries(steps)) {
      add(total.steps, mode(media.window, step), time)
    }
    if (end !== 'answer') {
      count(total.errors, end.replace(/\d+/g, 'N'))
      if (!end.startsWith('AbortError')) failed.set(media.url, now)
    }
    if (!media.stall) return
    let index = stalls.indexOf(media.stall)
    if (index === -1) return
    let closed: Stall = {
      ...media.stall,
      bytes: media.bytes,
      cause: findCause(steps),
      chatLists: media.lists,
      end,
      progress: media.progress,
      steps,
      took: now - media.asked,
      unknownChat: media.misses,
      window: media.window
    }
    stalls[index] = closed
    count(total.causes, String(closed.cause))
  }

  function finishLookup(id: number, answered: boolean, now: number): void {
    let lookup = lookups.get(id)
    if (!lookup) return
    lookups.delete(id)
    let media = lookup.media
    if (lookup.kind === 'loadChats') {
      for (let waiting of medias.values()) {
        if (waiting.lookups.has('getChat') && !waiting.chatAt) {
          waiting.lists += 1
        }
      }
    } else if (media && !answered) {
      // The loader asks again after the next part of the chat list
      media.misses += 1
      media.lookups.delete(lookup.kind)
    } else if (media && lookup.kind === 'getMessage') {
      media.postAt = now
    } else if (media) {
      media.chatAt = now
    }
  }

  function trackUpdate(session: string, update: Record<string, unknown>): void {
    let type = update['@type']
    if (type === 'updateFile') {
      let file = update.file
      if (!isObject(file) || !isObject(file.local)) return
      let done = Number(file.local.downloaded_size)
      for (let media of medias.values()) {
        if (media.file !== file.id || done === media.progress.at(-1)?.[1]) {
          continue
        }
        // Long video would fill the record with its parts
        if (media.progress.length >= 40) media.progress.pop()
        media.progress.push([Date.now() - media.asked, done])
      }
    } else if (type === 'updateConnectionState' && isObject(update.state)) {
      connection = String(update.state['@type']).replace('connectionState', '')
    } else if (type === 'updateOption' && update.name === 'is_premium') {
      total.premium = isObject(update.value) && update.value.value === true
    } else if (
      type === 'updateAuthorizationState' &&
      isObject(update.authorization_state) &&
      update.authorization_state['@type'] ===
        'authorizationStateWaitTdlibParameters'
    ) {
      online = false
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
  }

  function trackLog(line: string): void {
    for (let [name, pattern] of LOG) {
      let match = pattern.exec(line)
      if (!match) continue
      let found = match.groups
      let kind = found?.method ? `${name} ${found.method}` : name
      if (found?.number) add(total.logNumbers, kind, Number(found.number))
      count(total.log, kind)
      for (let media of medias.values()) {
        if (media.stall) count(media.stall.log, kind)
      }
      return
    }
  }

  let untrace = traceTelegram((event: TelegramTrace) => {
    let now = Date.now()
    if (event.type === 'queued') {
      let request = event.request
      let kind = request['@type']
      if (kind === 'setOption' && request.name === 'online') {
        online = isObject(request.value) && request.value.value === true
      }
      let media = [...medias.values()].find(i => {
        return !i.lookups.has(kind) && isLookupOf(request, i)
      })
      media?.lookups.add(kind)
      lookups.set(event.id, { kind, media, queued: now })
    } else if (event.type === 'sent') {
      let lookup = lookups.get(event.id)
      if (lookup?.media) lookup.media.slots += now - lookup.queued
    } else if (event.type === 'answered') {
      finishLookup(event.id, true, now)
    } else if (event.type === 'failed') {
      finishLookup(event.id, false, now)
    } else if (event.type === 'mediaAsked') {
      askMedia(event.id, event.url, event.urgency)
    } else if (event.type === 'mediaLoaded') {
      finishMedia(event.id, 'answer')
    } else if (event.type === 'mediaFailed') {
      let error = event.error
      finishMedia(
        event.id,
        error instanceof Error
          ? `${error.name} ${error.message}`.slice(0, 80)
          : 'unknown'
      )
    } else if (event.type === 'joined') {
      let media = medias.get(event.media)
      let loading = loadings.get(event.file)
      if (loading) {
        loading.bytes = event.bytes
        loading.urgency ??= media?.urgency
      }
      if (!media) return
      media.file = event.file
      media.bytes = event.bytes
      media.window = event.window
      media.joined = now
      if (loading && loading.step !== 'waiting') media.loadingAt = now
      if (loading?.step === 'moving') media.movingAt = now
    } else if (event.type === 'step') {
      if (event.step === 'done') {
        loadings.delete(event.file)
        return
      }
      let loading = loadings.get(event.file)
      loadings.set(event.file, {
        bytes: loading?.bytes ?? 0,
        since: now,
        step: event.step,
        urgency: loading?.urgency
      })
      for (let media of medias.values()) {
        if (media.file !== event.file || event.step === 'waiting') continue
        media.loadingAt ??= now
        if (event.step === 'moving') media.movingAt ??= now
      }
    } else if (event.type === 'update') {
      trackUpdate(event.session, event.update)
    } else {
      trackLog(event.line)
    }
    save()
  })

  let unbindVisibility = getEnvironment().onVisibilityChange(value => {
    visible = value
  })
  let unbindNetwork = getEnvironment().onNetwork(() => {
    for (let media of medias.values()) {
      if (media.stall) media.stall.networks += 1
    }
  })

  return () => {
    untrace()
    unbindVisibility()
    unbindNetwork()
    clearTimeout(saving)
    for (let media of medias.values()) clearTimeout(media.timer)
  }
}

export const telegramStalls: Experiment = {
  autostart: false,
  collects: true,
  description:
    'Saves on this device, where every slow Telegram file was waiting: ' +
    'in our queues or in Telegram. No chat names, IDs, or texts.',
  hidden: false,
  name: 'telegramStalls',
  onStart: collect,
  sending: false,
  title: 'Telegram stalled downloads'
}
