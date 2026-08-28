<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Output from '../../ui/output.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Output,
    title: 'UI/Output'
  })
</script>

<script lang="ts">
  import type { StoryContext } from 'storybook/internal/types'

  // The component hides the copied state in 3 seconds. Ignore its timer,
  // so the story will keep the state.
  async function copy({ canvas, userEvent }: StoryContext): Promise<void> {
    let timeout = window.setTimeout
    window.setTimeout = ((...args: Parameters<typeof window.setTimeout>) => {
      return args[1] && args[1] >= 1000 ? 0 : timeout(...args)
    }) as typeof window.setTimeout

    await userEvent.setup({}).click(canvas.getAllByRole('button')[1]!)
    await canvas.findByRole('button', { name: 'Copied' })
    window.setTimeout = timeout
  }
</script>

<Story name="Light" asChild play={copy}>
  <Section stack width={200}>
    <Output label="Base" value="test" />
    <Output label="Copied" value="test" />
  </Section>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
  play={copy}
>
  <Section stack width={200}>
    <Output label="Base" value="test" />
    <Output label="Copied" value="test" />
  </Section>
</Story>
