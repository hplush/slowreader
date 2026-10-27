<script lang="ts">
  import { mdiLockOpenVariant } from '@mdi/js'
  import { type NightTask, coachMessages as t } from '@slowreader/core'

  import Button from './button.svelte'
  import Error from './error.svelte'
  import Form from './form.svelte'
  import Input from './input.svelte'
  import Stack from './stack.svelte'

  let {
    onsolve,
    task,
    wrong
  }: {
    onsolve: (answer: string) => void
    task: NightTask
    wrong: boolean
  } = $props()

  let id = $props.id()
  let answer = $state('')
  let question = $derived(`${task.number} × ${task.multiplier} = ?`)
</script>

<Form
  onsubmit={() => {
    onsolve(answer)
    answer = ''
  }}
>
  <Stack align="center" gap="s">
    <div class="night-task_question" aria-hidden="true">{question}</div>
    {#if wrong}
      <Error id={`${id}-wrong`}>{$t.wrong}</Error>
    {/if}
    <Stack justify="center" row width="auto">
      <div class="night-task_answer">
        <Input
          autocomplete="off"
          errorId={wrong ? `${id}-wrong` : undefined}
          font="mono"
          inputmode="numeric"
          label={question}
          labelless
          pattern="[0-9]*"
          required
          bind:value={answer}
        />
      </div>
      <Button icon={mdiLockOpenVariant} type="submit">{$t.unlock}</Button>
    </Stack>
  </Stack>
</Form>

<style>
  :global {
    .night-task_question {
      font: var(--mono-font);
      font-size: 1.5rem;
    }

    .night-task_answer {
      width: 6rem;
    }
  }
</style>
