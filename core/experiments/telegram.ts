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

type Wait = {
  at: string
  bytes: [number, number] | undefined
  connection: string
  flight: Record<string, number>
  kind: string
  log: Record<string, number>
  sockets: Record<string, number>
  urgency: Urgency
  visible: boolean
} & ({ end: string; open: false; took: number } | { open: true })

interface Report {
  account: Record<string, unknown>
  connects: Record<string, Stat>
  downloads: Record<string, Stat>
  errors: Record<string, number>
  lanes: Record<string, Stat>
  log: Record<string, number>
  logNumbers: Record<string, Stat>
  memory: Record<string, number>
  network: number
  photos: Record<string, Stat>
  pushes: Record<string, number>
  requests: Record<string, Stat>
  since: string
  sockets: Record<string, number>
  starts: Record<string, Stat>
  version: 1
  waits: Wait[]
}

interface Pending {
  bytes: [number, number] | undefined
  file: number | undefined
  kind: string
  queued: number
  sent: number | undefined
  timer: ReturnType<typeof setTimeout>
  urgency: Urgency
  wait: undefined | Wait
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

// TDLib log has chat IDs and addresses, so we keep only the kind of the line
// and one number from it: seconds of the delay or count of lost requests.
// `tl:0x…` is Telegram’s ID of the method: file part, posts by IDs,
// and news of one channel.
const LOG: [string, RegExp][] = [
  ['floodPart', /Delay: .*tl:0xbe5335be.*\[timeout:(\d+).*FLOOD_/],
  ['floodPosts', /Delay: .*tl:0xad8c9a23.*\[timeout:(\d+).*FLOOD_/],
  ['floodOther', /Delay: .*\[timeout:(\d+).*FLOOD_/],
  ['hiddenRetry', /Delay: .*\[timeout:(\d+)/],
  ['gaveUp', /Failed: .*\[timeout:(\d+)/],
  ['pingTimeout', /with (\d+) pending requests was closed: .*Ping timeout/],
  ['readTimeout', /with (\d+) pending requests was closed: .*Read timeout/],
  ['noAnswer', /with (\d+) pending requests was closed: .*No answer from/],
  ['closed', /with (\d+) pending requests was closed/],
  ['connectFailed', /Failed connection/],
  ['connected', /Ready connection/],
  ['referenceExpired', /FILE_REFERENCE_EXPIRED/],
  ['referenceRepair', /Send file reference repair query/],
  ['newSession', /Generate new session_id/],
  ['handshakeFailed', /Handshake failed/],
  ['otherDataCenter', /Send exportAuthorization/],
  ['sentPart', /Send query to connection .*tl:0xbe5335be/],
  ['sentPosts', /Send query to connection .*tl:0xad8c9a23/],
  ['sentChannelNews', /Send query to connection .*tl:0x03173d78/]
]

function isReport(value: unknown): value is Report {
  return isObject(value) && value.version === 1
}

function collect(records: ExperimentRecords): () => void {
  let saved = records.loadRecords()[0]
  let report: Report = isReport(saved)
    ? saved
    : {
        account: {},
        connects: {},
        downloads: {},
        errors: {},
        lanes: {},
        log: {},
        logNumbers: {},
        memory: {},
        network: -1,
        photos: {},
        pushes: {},
        requests: {},
        since: new Date().toISOString(),
        sockets: {},
        starts: {},
        version: 1,
        waits: []
      }
  let pending = new Map<number, Pending>()
  let stuck = new Set<Wait>()
  let connection = 'Unknown'
  let visible = true
  let started: number | undefined
  let saving: ReturnType<typeof setTimeout> | undefined

  function save(): void {
    saving ??= setTimeout(() => {
      saving = undefined
      records.setRecord(report)
    }, 5000)
  }

  function watch(id: number): ReturnType<typeof setTimeout> {
    return setTimeout(() => {
      let request = pending.get(id)!
      if (request.wait) return
      let flight: Record<string, number> = {}
      for (let other of pending.values()) count(flight, other.kind)
      request.wait = {
        at: new Date().toISOString(),
        bytes: request.bytes,
        connection,
        flight,
        kind: request.kind,
        log: {},
        open: true,
        sockets: {},
        urgency: request.urgency,
        visible
      }
      stuck.add(request.wait)
      report.waits.push(request.wait)
      if (report.waits.length > 50) report.waits.shift()
      save()
    }, 10_000)
  }

  function finish(id: number, end: string): void {
    let request = pending.get(id)
    if (!request) return
    let now = Date.now()
    pending.delete(id)
    clearTimeout(request.timer)
    if (request.sent) {
      add(report.requests, request.kind, now - request.sent)
      if (now - request.sent < 10) count(report.memory, request.kind)
    }
    if (end !== 'answer') {
      count(report.errors, `${request.kind} ${end.replace(/\d+/g, 'N')}`)
    }
    if (request.wait) {
      stuck.delete(request.wait)
      let index = report.waits.indexOf(request.wait)
      if (index !== -1) {
        report.waits[index] = {
          ...request.wait,
          bytes: request.bytes,
          end,
          open: false,
          took: now - request.queued
        }
      }
    }
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
          report.account[name] = option.value
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
          add(report.downloads, 'firstByte', now - request.sent)
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
        prepare(session)
      } else if (state === 'authorizationStateReady' && started) {
        add(report.starts, 'ready', now - started)
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
      count(report.pushes, delay)
    }
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
        report.photos,
        String(size.type),
        Number(size.photo.size) || Number(size.photo.expected_size)
      )
    }
    add(report.photos, 'widest', widest)
  }

  traceTelegram((event: TelegramTrace) => {
    let now = Date.now()
    if (event.type === 'queued') {
      let request = event.request
      pending.set(event.id, {
        bytes: undefined,
        file:
          request['@type'] === 'downloadFile' && request.synchronous
            ? Number(request.file_id)
            : undefined,
        kind: request['@type'],
        queued: now,
        sent: undefined,
        timer: watch(event.id),
        urgency: event.urgency,
        wait: undefined
      })
    } else if (event.type === 'sent') {
      let request = pending.get(event.id)
      if (!request) return
      request.sent = now
      add(report.lanes, request.urgency, now - request.queued)
    } else if (event.type === 'answered') {
      let request = pending.get(event.id)
      if (request?.file !== undefined && request.sent) {
        add(report.downloads, 'whole', now - request.sent)
        add(report.downloads, 'bytes', Number(event.answer.size))
      }
      if (event.answer['@type'] === 'message') trackPhoto(event.answer)
      finish(event.id, 'answer')
    } else if (event.type === 'failed') {
      let error = event.error
      finish(
        event.id,
        error instanceof Error
          ? `${error.name} ${error.message}`.slice(0, 80)
          : 'unknown'
      )
    } else if (event.type === 'update') {
      trackUpdate(event.session, event.update)
    } else {
      let debug = event.debug
      let kind: string | undefined
      if (debug.type === 'log') {
        for (let [name, pattern] of LOG) {
          let match = pattern.exec(debug.line)
          if (!match) continue
          kind = name
          if (match[1]) add(report.logNumbers, name, Number(match[1]))
          break
        }
        if (kind) count(report.log, kind)
      } else if (debug.type === 'socketOpened') {
        kind = 'opened'
        add(report.connects, debug.host, debug.waited)
      } else {
        kind = debug.clean ? 'closed' : 'dropped'
      }
      if (kind) {
        if (debug.type !== 'log') count(report.sockets, kind)
        for (let wait of stuck) {
          count(debug.type === 'log' ? wait.log : wait.sockets, kind)
        }
      }
    }
    save()
  })

  let unbindVisibility = getEnvironment().onVisibilityChange(value => {
    visible = value
  })
  let unbindNetwork = getEnvironment().onNetwork(() => {
    report.network += 1
  })

  return () => {
    traceTelegram(undefined)
    unbindVisibility()
    unbindNetwork()
    clearTimeout(saving)
    for (let request of pending.values()) clearTimeout(request.timer)
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
