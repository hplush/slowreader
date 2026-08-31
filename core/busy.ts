import { atom } from 'nanostores'

export interface BusyValue {
  blocking?: boolean
  label: string
  progress?: number
}

let tasks: BusyValue[] = []

/**
 * Show loader over whole app until task is running.
 */
export const busy = atom<BusyValue | false>(false)

function update(): void {
  if (tasks.length === 0) {
    busy.set(false)
  } else {
    let last = tasks.findLast(i => i.label || i.progress !== undefined) ?? {
      label: ''
    }
    busy.set({
      blocking: tasks.some(i => i.blocking),
      label: last.label,
      progress: last.progress
    })
  }
}

/**
 * Show loader over whole app until task is running.
 */
export async function busyDuring<Value>(
  label: string,
  cb: (
    setProgress: (progress: number) => void,
    setLabel: (label: string) => void
  ) => Promise<Value>,
  blocking = false
): Promise<Value> {
  let task: BusyValue = { blocking, label }
  tasks.push(task)
  update()
  try {
    return await cb(
      progress => {
        task.progress = progress
        update()
      },
      changed => {
        task.label = changed
        update()
      }
    )
  } finally {
    tasks = tasks.filter(i => i !== task)
    update()
  }
}
