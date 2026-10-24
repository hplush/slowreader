<script lang="ts">
  import {
    mdiAccountMultiple,
    mdiCellphoneArrowDown,
    mdiCheck,
    mdiCloudUpload,
    mdiDeleteClock,
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
    unmarkWelcomeStep,
    type WelcomeStep,
    type WelcomeTodo
  } from '@slowreader/core'

  import { installApp } from '../stores/install.ts'
  import { getURL } from '../stores/url-router.ts'
  import Button from './button.svelte'
  import Icon from './icon.svelte'
  import Note from './note.svelte'
  import RichText from './rich-text.svelte'
  import Stack from './stack.svelte'

  let {
    extension,
    install,
    todo
  }: {
    extension: string | undefined
    install: { help: string; type: 'guide' } | { type: 'none' | 'prompt' }
    todo: WelcomeTodo
  } = $props()

  let uid = $props.id()
</script>

{#snippet checkbox(steps: WelcomeStep[], text: string, labelless = false)}
  {@const done = steps.every(step => todo.done.has(step))}
  {@const textId = uid + steps.join('-')}
  <div class="welcome-todo_title">
    <label class="welcome-todo_box">
      <input
        class="sr-only"
        aria-label={labelless ? text : undefined}
        aria-labelledby={labelless ? undefined : textId}
        checked={done}
        disabled={steps.some(step => todo.locked.has(step))}
        onchange={e => {
          if (e.currentTarget.checked) {
            markWelcomeStep(...steps)
          } else {
            unmarkWelcomeStep(...steps)
          }
        }}
        type="checkbox"
      />
      <span class="welcome-todo_mark">
        {#if done}
          <Icon path={mdiCheck} />
        {/if}
      </span>
    </label>
    {#if !labelless}
      <span id={textId} class="welcome-todo_text">{text}</span>
    {/if}
  </div>
{/snippet}

<ol class="welcome-todo">
  {#if todo.demo}
    <li class="welcome-todo_step">
      {@render checkbox(['slow', 'fast'], $t.explore)}
      {#if !todo.done.has('slow') || !todo.done.has('fast')}
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
      {/if}
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
    {@render checkbox(['import'], $t.import)}
    {#if !todo.done.has('import')}
      <Stack gap="m" row>
        <Button href={getURL('accounts')} icon={mdiAccountMultiple}>
          {$t.openAccounts}
        </Button>
        <Button href={getURL('import')} icon={mdiImport}>
          {$t.openImport}
        </Button>
      </Stack>
    {/if}
  </li>
  {#if extension}
    <li class="welcome-todo_step">
      {@render checkbox(['extension'], $t.extension)}
      {#if !todo.done.has('extension')}
        <Button href={extension} icon={mdiPuzzle} target="_blank">
          {$t.install}
        </Button>
      {/if}
    </li>
  {/if}
  {#if install.type === 'guide'}
    <li class="welcome-todo_step">
      {@render checkbox(['install'], $t.installApp)}
      {#if !todo.done.has('install')}
        <div class="welcome-todo_wide">
          <Note icon={mdiDeleteClock} variant="warning">
            {$t.installWarning}
          </Note>
        </div>
        <RichText text={$t.installSteps} url={install.help} />
        <Button href={getURL('signUp')} icon={mdiCloudUpload}>
          {$t.signUp}
        </Button>
      {/if}
    </li>
  {:else if install.type === 'prompt'}
    <li class="welcome-todo_step">
      {@render checkbox(['install'], $t.installApp)}
      {#if !todo.done.has('install')}
        <Button
          icon={mdiCellphoneArrowDown}
          onclick={() => {
            markWelcomeStep('install')
            void installApp()
          }}
        >
          {$t.install}
        </Button>
      {/if}
    </li>
  {/if}
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

    .welcome-todo_wide {
      align-self: stretch;
      margin-inline-start: calc(-2 * (1rem + var(--control-padding)));
    }

    .welcome-todo_title {
      display: flex;
      gap: var(--control-padding);
      align-items: flex-start;

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
    }

    .welcome-todo_box {
      display: flex;
      flex-shrink: 0;

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

      .welcome-todo_box:has(:focus-visible) & {
        @mixin focus;
      }

      .welcome-todo_box:has(:checked) & {
        background: var(--accent-color);
      }

      .welcome-todo_box:not(:has(:disabled)):active & {
        translate: 0 1px;
      }
    }

    .welcome-todo_text {
      font: var(--control-font);
      overflow-wrap: anywhere;

      .welcome-todo_title:has(:checked) & {
        color: var(--secondary-text-color);
      }
    }
  }
</style>
