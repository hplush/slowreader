<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  import Icon from './icon.svelte'

  let {
    icon,
    onclick,
    size = 'inline',
    variant = 'main',
    ...rest
  }: {
    children: Snippet
    icon?: string
    onclick?: (event: MouseEvent) => void
    size?: 'icon' | 'inline' | 'wide'
    variant?: 'main' | 'secondary'
  } & ({ href: string } | HTMLButtonAttributes) = $props()

  let textElement: HTMLElement | undefined
  let title = $state('')

  $effect(() => {
    if (textElement && size === 'icon') {
      title = textElement.textContent?.trim() || ''
    }
  })
</script>

{#snippet content()}
  <span class="button_cap">
    {#if icon}
      <Icon path={icon} />
    {/if}
    <span bind:this={textElement} class="button_text">
      {@render rest.children()}
    </span>
  </span>
{/snippet}

{#if 'href' in rest}
  <a
    class="button"
    class:is-icon={size === 'icon'}
    class:is-main={variant === 'main'}
    class:is-secondary={variant === 'secondary'}
    class:is-wide={size === 'wide'}
    href={rest.href}
    {onclick}
    title={size === 'icon' ? title : undefined}
  >
    {@render content()}
  </a>
{:else}
  <button
    {...rest}
    class="button"
    class:is-icon={size === 'icon'}
    class:is-main={variant === 'main'}
    class:is-secondary={variant === 'secondary'}
    class:is-wide={size === 'wide'}
    {onclick}
    title={size === 'icon' ? title : undefined}
    type={rest.type || 'button'}
  >
    {@render content()}
  </button>
{/if}

<style>
  :global {
    .button {
      box-sizing: border-box;
      display: inline-block;
      font: var(--control-font);
      color: var(--text-color);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      border: none;
      border-radius: 8px;

      &:active {
        box-shadow:
          inset 0 1px 2px oklch(0 0 0 / 50%),
          0 0.5px 0 oklch(1 0 0);
      }

      &.is-wide {
        width: 100%;
      }

      &.is-icon {
        width: 28px;
        height: 28px;
      }

      &.is-main {
        color: var(--land);
        background: oklch(0.3 0 0);

        &:hover,
        &:active,
        &:focus-visible {
          background: oklch(from oklch(0.3 0 0) calc(l + 0.06) c h);
        }

        &:active {
          box-shadow:
            inset 0 1px 2px oklch(0 0 0),
            0 0.5px 0 oklch(1 0 0);
        }
      }

      &.is-secondary {
        background: oklch(from var(--land) calc(l - 0.03) c h);

        &:hover,
        &:active,
        &:focus-visible {
          background: oklch(from var(--land) calc(l - 0.06) c h);
        }
      }
    }

    .button_cap {
      display: flex;
      flex-direction: row;
      gap: 4px;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;

      .button:active & {
        transform: translateY(1px);
      }
    }

    .button_text {
      .button.is-icon & {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
        border-width: 0;
      }
    }
  }
</style>
