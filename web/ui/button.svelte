<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  import Icon from './icon.svelte'
  import Loader from './loader.svelte'

  let {
    icon,
    loader,
    onclick,
    size = 'inline',
    variant = 'main',
    ...props
  }: {
    children: Snippet
    icon?: string
    loader?: boolean | string
    onclick?: (event: MouseEvent) => void
    size?: 'big' | 'icon' | 'inline' | 'pill' | 'wide'
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
  <span class="button_loader">
    {#if loader}
      <Loader
        inverse={variant === 'main'}
        label={typeof loader === 'string' ? loader : undefined}
      />
    {/if}
  </span>
  <span class="button_cap" aria-hidden={!!loader}>
    {#if icon}
      <Icon path={icon} />
    {/if}
    <span
      bind:this={textElement}
      class="button_text"
      class:sr-only={size === 'icon'}
    >
      {@render props.children()}
    </span>
  </span>
{/snippet}

{#if 'href' in props}
  <a
    class="button"
    class:is-big={size === 'big'}
    class:is-cta={variant === 'cta'}
    class:is-icon={size === 'icon'}
    class:is-loader={!!loader}
    class:is-main={variant === 'main'}
    class:is-pill={size === 'pill'}
    class:is-secondary={variant === 'secondary'}
    class:is-wide={size === 'wide' || size === 'big'}
    aria-disabled={!!loader}
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
    class:is-big={size === 'big'}
    class:is-cta={variant === 'cta'}
    class:is-icon={size === 'icon'}
    class:is-loader={!!loader}
    class:is-main={variant === 'main'}
    class:is-pill={size === 'pill'}
    class:is-secondary={variant === 'secondary'}
    class:is-wide={size === 'wide' || size === 'big'}
    aria-disabled={!!loader}
    {onclick}
    title={size === 'icon' ? title : undefined}
    type={props.type || 'button'}
  >
    {@render content()}
  </button>
{/if}

<style>
  :global {
    :root {
      --button-radius: 8px;
    }

    .button {
      position: relative;
      box-sizing: border-box;
      display: inline-block;
      font: var(--control-font);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      border: none;
      border-radius: var(--button-radius);

      &[aria-disabled='true'],
      &[disabled] {
        pointer-events: none;
      }

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
        font: var(--control-cta-font);
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
      min-height: 32px;
      padding: 7px 10px;

      .button:active & {
        transform: translateY(1px);
      }

      .button.is-icon & {
        width: 32px;
        padding: 0;
        text-align: center;
      }

      .button.is-big & {
        padding: 12px 10px;
      }

      .button.is-pill & {
        min-height: 24px;
        padding: 4px 8px;

        &:has(svg) {
          padding-inline-start: 6px;
        }
      }

      .button.is-loader & {
        opacity: 0%;
      }
    }

    .button_text {
      flex-shrink: 1;
    }

    .button_loader {
      position: absolute;
      inset: 0 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
