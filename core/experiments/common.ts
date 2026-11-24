export interface ExperimentRecords {
  addRecord(record: unknown): void
  loadRecords(): unknown[]
  setRecords(records: unknown[]): void
}

/**
 * `onStart` runs on the app start, or as soon as user enabled the experiment
 * in any tab. It returns a function to stop the experiment. Without it,
 * the app restarts after user disabled the experiment.
 */
export type Experiment = {
  autostart: boolean
  description: string
  hidden: boolean
  name: string
  sending: boolean
  title: string
} & (
  | {
      collects: false
      onStart(): (() => void) | void
    }
  | {
      collects: true
      onStart(records: ExperimentRecords): (() => void) | void
    }
)
