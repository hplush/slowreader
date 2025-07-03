<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  import Icon from './icon.svelte'

  let {
    icon,
    onclick,
    size = 'inline',
    variant = 'main',
    ...props
  }: {
    children: Snippet
    icon?: string
    onclick?: (event: MouseEvent) => void
    size?: 'icon' | 'inline' | 'pill' | 'wide'
    variant?: 'cta' | 'main' | 'secondary'
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
      {@render props.children()}
    </span>
  </span>
{/snippet}

{#if 'href' in props}
  <a
    class="button"
    class:is-cta={variant === 'cta'}
    class:is-icon={size === 'icon'}
    class:is-main={variant === 'main'}
    class:is-pill={size === 'pill'}
    class:is-secondary={variant === 'secondary'}
    class:is-wide={size === 'wide'}
    href={props.href}
    {onclick}
    title={size === 'icon' ? title : undefined}
  >
    {@render content()}
  </a>
{:else}
  <button
    {...props}
    class="button"
    class:is-cta={variant === 'cta'}
    class:is-icon={size === 'icon'}
    class:is-main={variant === 'main'}
    class:is-pill={size === 'pill'}
    class:is-secondary={variant === 'secondary'}
    class:is-wide={size === 'wide'}
    {onclick}
    title={size === 'icon' ? title : undefined}
    type={props.type || 'button'}
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
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      border: none;
      border-radius: 8px;

      &&:active {
        box-shadow: var(--pressed-shadow);
      }

      &.is-wide {
        width: 100%;
      }

      &.is-pill {
        font: var(--control-secondary-font);
        border-radius: 12px;
      }

      &.is-icon {
        width: 32px;
        height: 32px;
      }

      &.is-main {
        color: var(--current-background);
        background: var(--text-color);

        &:hover,
        &:active,
        &:focus-visible {
          background: oklch(
            from var(--text-color) calc(l + var(--button-hover-l)) c h
          );
        }
      }

      &.is-cta {
        color: oklch(1 0 0);
        background: var(--accent-color);
        box-shadow: var(--cta-button-shadow);

        &:hover,
        &:active,
        &:focus-visible {
          background: oklch(
            from var(--accent-color) calc(l + var(--button-hover-l)) c h
          );
        }
      }

      &.is-secondary {
        color: var(--text-color);
        background: oklch(
          from var(--current-background) calc(l + var(--secondary-l)) c h
        );

        &:hover,
        &:active,
        &:focus-visible {
          background: oklch(
            from var(--current-background)
              calc(l + var(--secondary-l) + var(--button-hover-l)) c h
          );
        }
      }
    }

    .button_cap {
      box-sizing: border-box;
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: center;
      padding: 7px 10px;

      .button:active & {
        transform: translateY(1px);
      }

      .button.is-icon & {
        width: 100%;
        height: 100%;
        padding: 0;
        text-align: center;
      }

      .button.is-pill & {
        padding: 4px 8px;

        &:has(svg) {
          padding-inline-start: 6px;
        }
      }
    }

    .button_text {
      flex-shrink: 1;

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
