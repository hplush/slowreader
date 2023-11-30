<script context="module" lang="ts">
  import UiLoader from '../../ui/loader.svelte'

  export const meta = {
    component: UiLoader,
    title: 'UI/Loader'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
  import { onMount } from 'svelte'

  import Section from '../section.svelte'

  let progress: number | undefined
  onMount(() => {
    let loaderAnimation = setInterval(() => {
      progress = progress === undefined ? 0.25 : progress + 0.25
      if (progress > 1) {
        progress = undefined
      }
    }, 1000)
    return () => {
      clearInterval(loaderAnimation)
    }
  })
</script>

<Story name="Light">
  <Section>
    <UiLoader />
  </Section>
  <Section>
    <UiLoader value={0.5} />
  </Section>
  <Section>
    <UiLoader value={progress} />
  </Section>
  <Section border height={100} width={100}>
    <UiLoader />
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <UiLoader />
</Story>
