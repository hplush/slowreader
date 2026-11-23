<script lang="ts" module>
  import { type Experiment, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import AboutPage from '../../pages/about.svelte'
  import ExperimentPopup from '../../popups/experiment.svelte'
  import ExperimentsPopup from '../../popups/experiments.svelte'
  import { clientUpdate } from '../../stores/client-update.ts'
  import { installation, safariBrowser } from '../../stores/install.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: ExperimentsPopup,
    title: 'Popups/Experiments'
  })

  function experiment(
    name: string,
    title: string,
    collects = true
  ): Experiment {
    return {
      autostart: false,
      collects,
      description:
        'Saves every connection change on this device to find why the app loses Telegram.',
      hidden: false,
      name,
      onStart() {},
      sending: false,
      title
    }
  }

  function setAbout(): void {
    installation.set('installed')
    safariBrowser.set(false)
    clientUpdate.set('latest')
  }
</script>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={setAbout}
    route={{ hash: 'experiments=1', params: {}, route: 'about' }}
  >
    <AboutPage page={pages.about()} />
    <ExperimentsPopup
      popup={{
        destroy() {},
        error: undefined,
        experiments: atom([
          {
            experiment: experiment('errors', 'Send error counts', false),
            hint: 'Sending'
          },
          {
            experiment: experiment(
              'long',
              'Veryveryverylongexperimenttitletooverflowthelistinthepopupcontentarea with few more words after it'
            ),
            hint: '1234 records'
          },
          {
            experiment: experiment('telegram', 'Telegram connection log'),
            hint: 'Enabled'
          },
          {
            experiment: experiment('video', 'New video player', false),
            hint: undefined
          }
        ]),
        loading: atom(false),
        name: 'experiments',
        notFound: false,
        param: '1',
        uniqueId: 'experiments'
      }}
    />
  </Scene>
</Story>

<Story name="Collector" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={setAbout}
    route={{ hash: 'experiment=telegram', params: {}, route: 'about' }}
  >
    <AboutPage page={pages.about()} />
    <ExperimentPopup
      popup={{
        destroy() {},
        enabled: atom(true),
        error: undefined,
        experiment: experiment('telegram', 'Telegram connection log'),
        loading: atom(false),
        name: 'experiment',
        notFound: false,
        param: 'telegram',
        records: atom(
          JSON.stringify(
            Array.from({ length: 40 }, (_, index) => ({
              state: index % 2 === 0 ? 'connecting' : 'ready',
              time: 1795439920699 + index * 834
            }))
          )
        ),
        uniqueId: 'experiment',
        updateRecords() {}
      }}
    />
  </Scene>
</Story>
