import { atom } from 'nanostores'

export interface BusyValue {
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
    busy.set({ label: last?.label, progress: last?.progress })
  }
}

/**
 * Show loader over whole app until task is running.
 */
export async function busyDuring<Value>(
  label: string,
  cb: (setProgress: (progress: number) => void) => Promise<Value>
): Promise<Value> {
  let task: BusyValue = { label }
  tasks.push(task)
  update()
  try {
    return await cb(progress => {
      task.progress = progress
      update()
    })
  } finally {
    tasks = tasks.filter(i => i !== task)
    update()
  }
}
