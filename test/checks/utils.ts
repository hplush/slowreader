// Common helpers for checks of the deployed app

import { styleText } from 'node:util'

export interface Site {
  hidden: boolean
  paths: string[]
}

export interface DnsAnswer {
  AD: boolean
  Answer?: { data: string }[]
  Status: number
}

export function pass(message: string): boolean {
  process.stdout.write(`${styleText('green', '✓')} ${message}\n`)
  return true
}

export function fail(message: string): boolean {
  process.stdout.write(`${styleText('red', '✗')} ${message}\n`)
  return false
}

export function grade(value: null | number | string): string {
  return styleText('bold', String(value))
}

export function link(url: string): string {
  return styleText('gray', url)
}

export function short(url: string): string {
  return url.replace('https://', '').replace(/\/$/, '')
}

export async function resolve(
  doh: string,
  name: string,
  type: string
): Promise<DnsAnswer> {
  let response = await fetch(`${doh}?name=${name}&type=${type}`, {
    headers: { accept: 'application/dns-json' }
  })
  return (await response.json()) as DnsAnswer
}
