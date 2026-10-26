<script lang="ts">
  import { mdiAlertOutline, mdiEyeOffOutline, mdiEyeOutline } from '@mdi/js'
  import { openWarnings, postMessages as t } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  import Button from '../button.svelte'
  import FormattedText from '../formatted-text.svelte'
  import Icon from '../icon.svelte'

  let {
    children,
    lang,
    warning
  }: {
    children: Snippet
    lang: null | string | undefined
    warning: null | string | undefined
  } = $props()

  let shown = $state(openWarnings.get())
</script>

{#if warning}
  <div class="post-warning">
    <div class="post-warning_text">
      <span class="post-warning_icon">
        <Icon path={mdiAlertOutline} />
      </span>
      <FormattedText html={warning} {lang} simple />
    </div>
    <div class="post-warning_button">
      <Button
        aria-expanded={shown}
        icon={shown ? mdiEyeOffOutline : mdiEyeOutline}
        onclick={() => {
          shown = !shown
        }}
        size="wide"
      >
        {shown ? $t.hideWarning : $t.showWarning}
      </Button>
    </div>
  </div>
{/if}
{#if !warning || shown}
  {@render children()}
{/if}

<style lang="postcss">
  :global {
    .post-warning {
      position: relative;
      z-index: 2;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      padding: 0.25rem;
      border: 0.0625rem solid;
      border-color: --tune-background(--note);
      border-radius: calc(var(--base-radius) + 0.3125rem);

      @mixin background var(--note-warning-background);
    }

    .post-warning_text {
      display: flex;
      flex: 1 1 10rem;
      gap: 0.25rem;
      align-items: center;
      padding-inline-start: 0.25rem;
      font: var(--secondary-font);
    }

    .post-warning_icon {
      --icon-size: 1.25rem;

      color: --tune-background(--note);
    }

    .post-warning_button {
      display: flex;
      flex: 0 0 8rem;
    }
  }
</style>
