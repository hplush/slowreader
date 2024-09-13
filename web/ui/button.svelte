<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  import Hotkey from './hotkey.svelte'
  import Icon from './icon.svelte'

  let {
    dangerous = false,
    hotkey,
    icon,
    onclick,
    secondary = false,
    wide = false,
    ...rest
  }: {
    dangerous?: boolean
    hotkey?: string
    icon?: string
    onclick?: (event: MouseEvent) => void
    secondary?: boolean
    wide?: boolean
  } & ({ children: Snippet } | { hiddenLabel: string }) &
    ({ href: string } | HTMLButtonAttributes) = $props()
</script>

{#snippet content()}
  {#if !('hiddenLabel' in rest)}
    {#if icon}
      <Icon path={icon} />
    {/if}
    <span>
      {@render rest.children()}
    </span>
  {:else}
    {#if icon}
      <div class="button_center"></div>
    {/if}
    <span class="button_size" aria-hidden="true">x</span>
  {/if}
  {#if hotkey}
    <Hotkey {hotkey} />
  {/if}
{/snippet}

{#if 'href' in rest}
  <a
    class="button"
    class:is-dangerous={dangerous}
    class:is-secondary={secondary}
    class:is-square={'hiddenLabel' in rest ? rest.hiddenLabel : undefined}
    class:is-wide={wide}
    aria-keyshortcuts={hotkey}
    href={rest.href}
    {onclick}
    title={'hiddenLabel' in rest ? rest.hiddenLabel : undefined}
  >
    {@render content()}
  </a>
{:else}
  <button
    {...rest}
    class="button"
    class:is-dangerous={dangerous}
    class:is-secondary={secondary}
    class:is-square={'hiddenLabel' in rest ? rest.hiddenLabel : undefined}
    class:is-wide={wide}
    aria-keyshortcuts={hotkey}
    {onclick}
    title={'hiddenLabel' in rest ? rest.hiddenLabel : undefined}
    type={rest.type || 'button'}
  >
    {@render content()}
  </button>
{/if}

<style>
  .button {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    gap: var(--padding-m);
    align-items: center;
    justify-content: center;
    padding: var(--padding-m) var(--padding-l);
    font: var(--control-font);
    color: var(--text-color);
    text-decoration: none;
    cursor: pointer;
    user-select: none;
    background: var(--card-color);
    border: none;
    border-radius: var(--radius);
    box-shadow: var(--button-shadow);

    &:hover,
    &:focus-visible,
    &:active {
      background: var(--hover-color);
    }

    &:active {
      box-shadow: var(--button-active-shadow);

      & > * {
        transform: translateY(1px);
      }
    }

    &.is-wide {
      flex-shrink: 1;
      width: 100%;
    }

    &.is-square {
      width: auto;
      height: fit-content;
      aspect-ratio: 1;
    }

    &.is-dangerous {
      color: var(--dangerous-text-color);
      background: var(--dangerous-card-color);

      &:hover,
      &:focus-visible,
      &:active {
        background: var(--dangerous-card-hover-color);
      }
    }

    &.is-secondary {
      border: 1px solid var(--border-color);
      box-shadow: none;

      &:not(.is-square) {
        padding-inline: calc(var(--padding-l) - 1px);
      }

      &.is-dangerous {
        box-shadow: var(--flat-dangerous-shadow);
      }

      &:active {
        box-shadow: var(--above-2-shadow);
      }
    }
  }

  .button_center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .button_size {
    visibility: hidden;
  }
</style>
