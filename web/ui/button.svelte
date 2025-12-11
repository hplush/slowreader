<script lang="ts" module>
  export type ButtonSize = 'big' | 'icon' | 'inline' | 'pill' | 'wide'

  export type ButtonVariant =
    | 'attention'
    | 'main'
    | 'plain-dangerous'
    | 'plain-secondary'
    | 'plain'
    | 'secondary-dangerous'
    | 'secondary'

  export type ButtonPseudostate =
    | 'active'
    | 'focus-visible'
    | 'hover'
    | undefined
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
    MouseEventHandler
  } from 'svelte/elements'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'
  import Loader from './loader.svelte'

  let {
    children,
    disabled,
    icon,
    loader,
    onclick,
    pseudostate,
    size = 'inline',
    variant = 'secondary',
    ...props
  }: {
    children: Snippet
    disabled?: boolean
    icon?: string
    loader?: boolean | number | string
    onclick?: MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>
    pseudostate?: ButtonPseudostate
    size?: ButtonSize
    variant?: ButtonVariant
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
    button: true,
    'is-attention': variant === 'attention',
    'is-big': size === 'big',
    'is-icon': size === 'icon',
    'is-loader': !!loader,
    'is-main': variant === 'main',
    'is-pill': size === 'pill',
    'is-plain': variant === 'plain',
    'is-plain-dangerous': variant === 'plain-dangerous',
    'is-plain-secondary': variant === 'plain-secondary',
    'is-pseudo-active': pseudostate === 'active',
    'is-pseudo-focus-visible': pseudostate === 'focus-visible',
    'is-pseudo-hover': pseudostate === 'hover',
    'is-secondary': variant === 'secondary',
    'is-secondary-dangerous': variant === 'secondary-dangerous',
    'is-wide': size === 'wide' || size === 'big'
  }}
  disabled={!!loader || !!disabled}
  {onclick}
  title={size === 'icon' ? title : undefined}
>
  <span class="button_loader">
    {#if loader}
      <Loader
        label={typeof loader === 'string' ? loader : undefined}
        value={typeof loader === 'number' ? loader : undefined}
        variant={variant === 'main' ? 'accent' : 'auto'}
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
        flex-shrink: 1;
        width: stretch;
      }

      &.is-pill {
        font: var(--control-secondary-font);
        border-radius: 0.75rem;
        corner-shape: round;
      }

      &.is-main {
        color: var(--text-on-accent-color);
        background: var(--accent-color);
        box-shadow: var(--button-shadow);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-color(--accent-color, --button-hover);
        }
      }

      &.is-attention {
        background: --tune-background(--current);
        box-shadow: var(--button-shadow);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-background(--current --flat-button-hover);
        }
      }

      &.is-secondary {
        color: var(--text-color);
        background: --tune-background(--flat-button);
        box-shadow: var(--flat-control-shadow);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-background(--flat-button --flat-button-hover);
        }
      }

      &.is-secondary-dangerous {
        color: var(--dangerous-text-color);
        background: --tune-background(--flat-button --colorize, --dangerous);
        box-shadow: var(--flat-dangerous-shadow);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-background(
            --flat-button --flat-button-hover --colorize,
            --dangerous
          );
        }
      }

      &.is-plain {
        color: var(--text-color);
        background: transparent;

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-background(--flat-button --flat-button-hover);
        }
      }

      &.is-plain-secondary {
        color: var(--secondary-text-color);
        background: transparent;

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          color: var(--text-color);
          background: --tune-background(--flat-button --flat-button-hover);
          opacity: 100%;
        }
      }

      &.is-plain-dangerous {
        color: var(--dangerous-text-color);
        background: transparent;

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-background(
            --flat-button --flat-button-hover --colorize,
            --dangerous
          );
        }
      }
    }

    .button_cap {
      box-sizing: border-box;
      display: flex;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
      min-height: var(--control-height);
      padding: 0.4rem var(--control-padding);

      .button:active:not([aria-disabled='true']) & {
        translate: 0 1px;
      }

      .button.is-icon & {
        width: var(--control-height);
        padding: 0;
        text-align: center;
      }

      .button.is-big & {
        min-height: calc(1.3 * var(--control-height));
        padding-inline: 0.625rem;
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
      overflow-wrap: anywhere;
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
