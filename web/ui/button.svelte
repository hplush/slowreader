<script lang="ts">
  import type { Snippet } from 'svelte'
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
    MouseEventHandler
  } from 'svelte/elements'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'
  import InverseTheme from './inverse-theme.svelte'
  import Loader from './loader.svelte'

  let {
    children,
    disabled,
    icon,
    loader,
    onclick,
    size = 'inline',
    variant = 'main',
    ...props
  }: {
    children: Snippet
    disabled?: boolean
    icon?: string
    loader?: boolean | string
    onclick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
    size?: 'big' | 'icon' | 'inline' | 'pill' | 'wide'
    variant?: 'cta' | 'main' | 'secondary'
  } & (
    | ({ href: string } & HTMLAnchorAttributes)
    | ({ href?: undefined } & HTMLButtonAttributes)
  ) = $props()

  let textElement: HTMLElement | undefined
  let title = $state('')

  $effect(() => {
    if (textElement && size === 'icon') {
      title = textElement.textContent.trim() || ''
    }
  })
</script>

<Clickable
  {...props}
  class={{
    'button': true,
    'is-big': size === 'big',
    'is-cta': variant === 'cta',
    'is-icon': size === 'icon',
    'is-loader': !!loader,
    'is-main': variant === 'main',
    'is-pill': size === 'pill',
    'is-secondary': variant === 'secondary',
    'is-wide': size === 'wide' || size === 'big'
  }}
  disabled={!!loader || !!disabled}
  {onclick}
  title={size === 'icon' ? title : undefined}
>
  <span class="button_loader">
    {#if loader}
      {#if variant === 'main'}
        <InverseTheme>
          <Loader label={typeof loader === 'string' ? loader : undefined} />
        </InverseTheme>
      {:else}
        <Loader label={typeof loader === 'string' ? loader : undefined} />
      {/if}
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
      {@render children()}
    </span>
  </span>
</Clickable>

<style lang="postcss">
  :global {
    .button {
      @mixin clickable;

      position: relative;
      display: inline-block;
      font: var(--control-font);
      border-radius: var(--base-radius);

      &&:active {
        box-shadow: var(--pressed-shadow);
      }

      &.is-wide {
        width: stretch;
      }

      &.is-pill {
        font: var(--control-secondary-font);
        border-radius: 0.75rem;
      }

      &.is-main {
        color: var(--current-background);
        background: var(--text-color);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-color(--text-color, --button-hover);
        }
      }

      &.is-cta {
        font: var(--control-cta-font);
        color: var(--cta-button-color);
        background: var(--accent-color);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-color(--accent-color, --button-hover);
        }
      }

      &.is-secondary {
        color: var(--text-color);
        background: --tune-background(--secondary);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-background(--secondary, --secondary-hover);
        }
      }
    }

    .button_cap {
      box-sizing: border-box;
      display: flex;
      gap: 0.4rem;
      align-items: center;
      justify-content: center;
      min-height: 2.062rem;
      padding: 0.437rem 0.75rem;

      .button:active:not([aria-disabled='true']) & {
        translate: 0 1px;
      }

      .button.is-icon & {
        width: 2rem;
        padding: 0;
        text-align: center;
      }

      .button.is-big & {
        padding: 0.75rem 0.625rem;
      }

      .button.is-pill & {
        min-height: 1.562rem;
        padding: 0.25rem 0.5rem;

        &:has(svg) {
          padding-inline-start: 0.375rem;
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
      inset: 0 0.625rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
