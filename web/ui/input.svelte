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
    labelless = false,
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
    labelless?: boolean
    onchange?: (v: string, valid: boolean) => void
    onescape?: () => void
    oninput?: (v: string, valid: boolean) => void
    validate?: Validator | Validator[]
  } & Omit<HTMLInputAttributes, 'onchange' | 'oninput'> = $props()

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
  {#if !labelless}
    <Label {id}>{label}</Label>
  {/if}
  <input
    bind:this={input}
    {id}
    class="input_field"
    class:is-mono={font === 'mono'}
    aria-disabled={disabled}
    aria-errormessage={errorId || (inputError || error ? `${id}-error` : null)}
    aria-invalid={inputError || error || errorId ? true : null}
    aria-label={labelless ? label : null}
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
  {#if inputError || error}
    <div class="input_error">
      <Error id={`${id}-error`}>{inputError || error}</Error>
    </div>
  {/if}
</div>

<style>
  :global {
    .input {
      flex-shrink: 1;
      width: stretch;
    }

    .input_field {
      box-sizing: border-box;
      width: stretch;
      height: var(--control-height);
      padding: 0 var(--control-padding);
      background: --tune-background(--field);
      border: none;
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
      corner-shape: squircle;

      &[aria-invalid] {
        background: --tune-background(--secondary, --dangerous);
        box-shadow:
          0 0 0 1px var(--dangerous-text-color),
          var(--field-shadow);
      }

      &.is-mono {
        font: var(--mono-font);
      }
    }

    .input_field::placeholder {
      color: var(--secondary-text-color);
    }

    .input_error {
      margin-top: 0.125rem;
    }
  }
</style>
