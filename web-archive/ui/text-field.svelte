<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'
  import { nanoid } from 'nanoid/non-secure'
  import { onMount } from 'svelte'

  let {
    controls,
    error,
    errorId,
    hideLabel = false,
    label,
    onchange,
    oninput,
    placeholder = '',
    required = false,
    spellcheck = true,
    type = 'text',
    value = $bindable('')
  }: {
    controls?: string
    error?: string
    errorId?: string
    hideLabel?: boolean
    label: string
    onchange?: (v: string, valid: boolean) => void
    oninput?: (v: string, valid: boolean) => void
    placeholder?: string
    required?: boolean
    spellcheck?: boolean
    type?: 'email' | 'password' | 'text' | 'url'
    value?: string
  } = $props()

  let id = nanoid()
  let inputError = $state<string | undefined>(error)

  function validate(): void {
    if (required && !value) {
      inputError = t.get().empty
    } else if (type === 'url' && !URL.canParse(value)) {
      inputError = t.get().noUrl
    }
  }

  function isValid(): boolean {
    return !inputError || !error || !errorId
  }

  function onInput(e: { currentTarget: HTMLInputElement } & Event): void {
    value = e.currentTarget.value
    if (oninput) oninput(value, isValid())
  }

  function onChange(e: { currentTarget: HTMLInputElement } & Event): void {
    value = e.currentTarget.value
    validate()
    if (onchange) onchange(value, isValid())
  }

  function onKeyUp(): void {
    if (required) {
      if (!value) {
        inputError = t.get().empty
      }
    }
  }

  function onBlur(): void {
    validate()
  }

  onMount(() => {
    if (value && type === 'url') {
      if (!URL.canParse(value)) inputError = t.get().noUrl
    }
  })
</script>

<div class="text-field">
  {#if label && !hideLabel}
    <label class="text-field_label" for={id}>{label}</label>
  {/if}
  <input
    id={label ? id : null}
    class="text-field_input"
    aria-controls={controls}
    aria-errormessage={errorId || (inputError || error ? `${id}-error` : null)}
    aria-invalid={inputError || error || errorId ? true : null}
    aria-label={hideLabel ? label : null}
    onblur={onBlur}
    onchange={onChange}
    oninput={onInput}
    onkeyup={onKeyUp}
    {placeholder}
    {required}
    spellcheck={spellcheck ? null : 'false'}
    {type}
    {value}
  />
  {#if inputError}
    <div id={`${id}-error`} class="text-field_error">{inputError}</div>
  {:else if error}
    <div id={`${id}-error`} class="text-field_error">{error}</div>
  {/if}
</div>

<style global>
  :global {
    .text-field {
      position: relative;
      flex-shrink: 1;
      width: 100%;
      margin-top: var(--padding-l);
    }

    .card > .text-field:first-child {
      margin-top: calc(var(--card-text-fix) - 4px);
    }

    .text-field:first-child:not(:has(.text-field_label)) {
      margin-top: 0;
    }

    .text-field_label {
      padding: 0 var(--padding-m) var(--padding-m) var(--padding-m);
      font-weight: bold;
    }

    .text-field_input {
      box-sizing: border-box;
      width: 100%;
      padding: var(--padding-m);
      background-color: var(--field-color);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      box-shadow: var(--field-shadow);

      &[aria-invalid='true'] {
        border-color: var(--error-color);
      }

      &:focus-visible {
        border-color: var(--focus-color);
        outline: 3px solid oklch(from var(--focus-color) l c h / 50%);
        outline-offset: 0;
      }
    }

    .text-field_error {
      padding: 0 var(--padding-m);
      color: var(--error-color);
    }

    .card > .text-field_error:last-child {
      margin-bottom: var(--card-text-fix);
    }
  }
</style>
