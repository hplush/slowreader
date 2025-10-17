<script lang="ts">
  import { notEmpty, type Validator, validUrl } from '@slowreader/core'
  import { onMount } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { on } from 'svelte/events'

  import Error from './error.svelte'
  import Label from './label.svelte'

  let {
    disabled,
    error,
    errorId,
    font = 'normal',
    input = $bindable(),
    label,
    onchange,
    onescape,
    oninput,
    type = 'text',
    validate = () => undefined,
    value = $bindable(''),
    ...props
  }: {
    disabled?: boolean
    error?: string
    errorId?: string
    font?: 'mono' | 'normal'
    input?: HTMLInputElement
    label: string
    onchange?: (v: string, valid: boolean) => void
    onescape?: () => void
    oninput?: (v: string, valid: boolean) => void
    validate?: Validator | Validator[]
  } & HTMLInputAttributes = $props()

  let id = $props.id()
  let inputError = $state<string | undefined>(error)
  let isValid = $derived(!inputError || !error || !errorId)

  let validators = Array.isArray(validate) ? validate : [validate]

  if (props.required) validators.unshift(notEmpty)
  if (type === 'url') validators.unshift(validUrl)

  function runValidators(val: string): string | undefined {
    for (let validator of validators) {
      let result = validator(val)
      if (result) return result
    }
    return undefined
  }

  onMount(() => {
    if (input) {
      return on(input, 'validate', () => {
        inputError = runValidators(value)
      })
    }
  })
</script>

<div class="input">
  <Label {id}>{label}</Label>
  <input
    bind:this={input}
    {id}
    class="input_field"
    class:is-mono={font === 'mono'}
    aria-disabled={disabled}
    aria-errormessage={errorId || (inputError || error ? `${id}-error` : null)}
    aria-invalid={inputError || error || errorId ? true : null}
    data-invalid={!!runValidators(value)}
    onblur={e => {
      value = e.currentTarget.value
      if (value !== '') inputError = runValidators(value)
    }}
    onchange={e => {
      value = e.currentTarget.value
      inputError = runValidators(value)
      if (onchange) onchange(value, isValid)
    }}
    oninput={e => {
      if (oninput) oninput(e.currentTarget.value, isValid)
    }}
    onkeyup={e => {
      if (e.key === 'Escape') onescape?.()
      if (inputError) {
        inputError = runValidators(e.currentTarget.value)
      }
    }}
    readonly={disabled}
    {type}
    {value}
    {...props}
  />
  <Error id={`${id}-error`} field text={inputError || error} />
</div>

<style>
  :global {
    .input {
      width: stretch;
    }

    .input_field {
      box-sizing: border-box;
      width: stretch;
      height: var(--control-height);
      padding: 0 0.5rem;
      font: var(--control-font);
      background: --tune-background(--field);
      border: none;
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
      corner-shape: squircle;

      &:focus-visible {
        outline-offset: 0;
      }

      &[aria-invalid] {
        background: var(--note-dangerous-background);
      }

      &.is-mono {
        font: var(--control-mono-font);
      }
    }
  }
</style>
