<script lang="ts">
  import { commonMessages as t } from '@slowreader/core/messages'
  import { nanoid } from 'nanoid/non-secure'
  import { createEventDispatcher, onMount } from 'svelte'

  export let type: 'email' | 'password' | 'text' | 'url' = 'text'
  export let error: string | undefined = undefined
  export let errorId: string | undefined = undefined
  export let label: string
  export let placeholder = ''
  export let required = false
  export let value = ''
  export let enterHint = false
  export let hideLabel = false

  let id = nanoid()
  let inputError: string | undefined = error
  let dispatch = createEventDispatcher<{
    change: { valid: boolean; value: string }
    enter: { valid: boolean; value: string }
    input: { valid: boolean; value: string }
  }>()

  function validate(): void {
    if (required && !value) {
      inputError = t.get().empty
    } else if (type === 'url' && !isValidUrl()) {
      inputError = t.get().noUrl
    }
  }

  function isValid(): boolean {
    return !inputError || !error || !errorId
  }

  function onInput(e: Event & { currentTarget: HTMLInputElement }): void {
    value = e.currentTarget.value
    dispatch('input', { valid: isValid(), value })
  }

  function onChange(e: Event & { currentTarget: HTMLInputElement }): void {
    value = e.currentTarget.value
    validate()
    dispatch('change', { valid: isValid(), value })
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      validate()
      dispatch('change', { valid: isValid(), value })
      dispatch('enter', { valid: isValid(), value })
    } else if (required) {
      if (!value) {
        inputError = t.get().empty
      }
    }
  }

  function onBlur(): void {
    validate()
  }

  function isValidUrl(): boolean {
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }

  onMount(() => {
    if (value && type === 'url') {
      if (!isValidUrl()) inputError = t.get().noUrl
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
    aria-errormessage={errorId || (inputError || error ? `${id}-error` : null)}
    aria-invalid={inputError || error || errorId ? true : null}
    aria-label={hideLabel ? label : null}
    {placeholder}
    {required}
    {type}
    {value}
    on:input={onInput}
    on:keyup={onKeyUp}
    on:blur={onBlur}
    on:change={onChange}
  />
  {#if enterHint}
    <span class="text-field_hotkey">↵</span>
  {/if}
  {#if inputError}
    <div id={`${id}-error`} class="text-field_error">{inputError}</div>
  {:else if error}
    <div id={`${id}-error`} class="text-field_error">{error}</div>
  {/if}
</div>

<style>
  .text-field {
    position: relative;
    width: 100%;
    margin-top: var(--padding-l);
  }

  :global(.card) > .text-field:first-child {
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
    height: var(--control-height);
    padding: 0 var(--padding-m);
    background-color: var(--field-color);
    border: 1px solid var(--border-color);
    border-radius: var(--inner-radius);
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

  :global(.card) > .text-field_error:last-child {
    margin-bottom: var(--card-text-fix);
  }

  .text-field_hotkey {
    position: absolute;
    inset-inline-end: var(--padding-m);
    display: none;
    align-items: center;
    justify-content: center;
    width: 10px;
    height: var(--control-height);
    margin-top: calc(-1 * var(--control-height));
    font: var(--hotkey-font);
    color: color-mix(in oklab, var(--hotkey-color), var(--text-color));
  }

  .text-field_input:focus-visible + .text-field_hotkey {
    display: flex;
  }

  :global(.is-hotkey-disabled)
    .text-field_input:focus-visible
    + .text-field_hotkey {
    display: none;
  }
</style>
