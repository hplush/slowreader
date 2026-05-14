import { VERSION } from '@slowreader/api'
import { atom } from 'nanostores'

import { createPage } from './common.ts'
import { contributorsMock } from './contributors.ts'

export type Contributor = {
  avatar_url: string
  contributions: number
  html_url: string
  id: number
  login: string
  type: string
}

const EXCLUDED_LOGINS = new Set(['actions-user', 'dependabot[bot]'])

async function getContributors(): Promise<Contributor[]> {
  let response = await fetch(
    'https://api.github.com/repos/hplush/slowreader/contributors'
  )
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  let data = (await response.json()) as Contributor[]
  return data.filter(contributor => !EXCLUDED_LOGINS.has(contributor.login))
}

export const aboutPage = createPage('about', () => {
  let $credits = atom<Contributor[] | null>(null)
  let $showCredits = atom<boolean>(false)

  getContributors()
    .then(data => {
      $credits.set(data)
    })
    .catch(() => {
      $credits.set(contributorsMock)
    })

  function toggleCredits(): void {
    $showCredits.set(!$showCredits.get())
  }

  return {
    appVersion: VERSION,
    credits: $credits,
    exit() { },
    params: {},
    showCredits: $showCredits,
    toggleCredits
  }
})

export type AboutPage = ReturnType<typeof aboutPage>
