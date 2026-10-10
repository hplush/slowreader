<script lang="ts">
  import {
    mdiCheck,
    mdiFireplace,
    mdiFood,
    mdiImport,
    mdiPuzzle
  } from '@mdi/js'
  import {
    deleteDemoWithBusy,
    keepDemo,
    markWelcomeStep,
    welcomeMessages as t,
    type WelcomeStep,
    type WelcomeTodo
  } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from './button.svelte'
  import Icon from './icon.svelte'
  import Stack from './stack.svelte'

  let { extension, todo }: { extension: string; todo: WelcomeTodo } = $props()
</script>

{#snippet checkbox(steps: WelcomeStep[], text: string, labelless = false)}
  {@const done = steps.every(step => todo.done.has(step))}
  <label class="welcome-todo_label">
    <input
      class="sr-only"
      aria-label={labelless ? text : undefined}
      checked={done}
      disabled={done}
      onchange={() => {
        markWelcomeStep(...steps)
      }}
      type="checkbox"
    />
    <span class="welcome-todo_mark">
      {#if done}
        <Icon path={mdiCheck} />
      {/if}
    </span>
    {#if !labelless}
      <span class="welcome-todo_text">{text}</span>
    {/if}
  </label>
{/snippet}

<ol class="welcome-todo">
  {#if todo.demo}
    <li class="welcome-todo_step">
      {@render checkbox(['slow', 'fast'], $t.explore)}
      <ol class="welcome-todo_substeps">
        <li class="welcome-todo_substep">
          {@render checkbox(['slow'], $t.slowFeeds, true)}
          <Button href={getURL('slow')} icon={mdiFireplace}>
            {$t.slowFeeds}
          </Button>
        </li>
        <li class="welcome-todo_substep">
          {@render checkbox(['fast'], $t.fastFeeds, true)}
          <Button href={getURL('fast')} icon={mdiFood}>{$t.fastFeeds}</Button>
        </li>
      </ol>
    </li>
    <li class="welcome-todo_step">
      {@render checkbox(['clean'], $t.clean)}
      {#if !todo.done.has('clean')}
        <Stack gap="xs" row>
          <Button
            joined="start"
            onclick={deleteDemoWithBusy}
            variant="secondary-dangerous"
          >
            {$t.drop}
          </Button>
          <Button joined="end" onclick={keepDemo}>{$t.keep}</Button>
        </Stack>
      {/if}
    </li>
  {/if}
  <li class="welcome-todo_step">
    {@render checkbox(['extension'], $t.extension)}
    {#if !todo.done.has('extension')}
      <Button href={extension} icon={mdiPuzzle} target="_blank">
        {$t.install}
      </Button>
    {/if}
  </li>
  <li class="welcome-todo_step">
    {@render checkbox(['import'], $t.import)}
    {#if !todo.done.has('import')}
      <Button href={getURL('import')} icon={mdiImport}>{$t.openImport}</Button>
    {/if}
  </li>
  <li class="welcome-todo_step">
    {@render checkbox(['read'], $t.read)}
  </li>
</ol>

<style lang="postcss">
  :global {
    .welcome-todo {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: stretch;
      list-style: none;
      counter-reset: step;
    }

    .welcome-todo_step {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
      padding-inline-start: calc(2 * (1rem + var(--control-padding)));
      counter-increment: step;
    }

    .welcome-todo_substeps {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      list-style: none;
    }

    .welcome-todo_substep {
      display: flex;
      gap: var(--control-padding);
      align-items: center;
    }

    .welcome-todo_label {
      display: flex;
      gap: var(--control-padding);
      align-items: flex-start;
      border-radius: var(--base-radius);

      .welcome-todo_step > & {
        margin-inline-start: calc(-2 * (1rem + var(--control-padding)));

        &::before {
          flex-shrink: 0;
          width: 1rem;
          font: var(--control-font);
          color: var(--secondary-text-color);
          text-align: end;
          content: counter(step) '.';
        }
      }

      &:has(:focus-visible) {
        @mixin focus;
      }

      html:not(.is-quiet-cursor) &:not(:has(:disabled)) {
        cursor: pointer;
      }
    }

    .welcome-todo_mark {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      margin-top: 0.1875rem;
      color: var(--text-on-accent-color);
      background: --tune-background(--placeholder);
      border-radius: calc(var(--base-radius) / 2);

      --icon-size: 0.875rem;

      .welcome-todo_label:has(:checked) & {
        background: var(--accent-color);
      }

      .welcome-todo_label:not(:has(:disabled)):active & {
        translate: 0 1px;
      }
    }

    .welcome-todo_text {
      font: var(--control-font);
      overflow-wrap: anywhere;

      .welcome-todo_label:has(:checked) & {
        color: var(--secondary-text-color);
      }
    }
  }
</style>
