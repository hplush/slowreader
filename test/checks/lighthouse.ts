// Check performance, best practices, and indexing by Google Lighthouse
// in PageSpeed Insights.
// Free API key: https://developers.google.com/speed/docs/insights/v5/get-started

import { styleText } from 'node:util'

import { fail, grade, link, pass, short, type Site } from './utils.ts'

interface Insights {
  error?: { message: string }
  lighthouseResult: {
    audits: Record<string, Audit>
    categories: Record<string, Category>
  }
}

interface Audit {
  score: null | number
  title: string
}

interface Category {
  auditRefs: { group?: string; id: string }[]
  score: number
  title: string
}

export async function checkLighthouse(
  sites: Record<string, Site>
): Promise<boolean> {
  if (!process.env.PAGESPEED_KEY) {
    return fail('Set PAGESPEED_KEY to run Lighthouse')
  }
  let results = []
  for (let [host, site] of Object.entries(sites)) {
    for (let path of site.paths) {
      let url = `https://${host}${path}`
      let query = new URLSearchParams({
        key: process.env.PAGESPEED_KEY,
        strategy: 'mobile',
        url
      })
      for (let category of [
        'PERFORMANCE',
        'ACCESSIBILITY',
        'BEST_PRACTICES',
        'SEO'
      ]) {
        query.append('category', category)
      }
      let response = await fetch(
        `https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${query.toString()}`
      )
      let insights = (await response.json()) as Insights
      if (insights.error) {
        results.push(
          fail(
            `Lighthouse can not scan ${short(url)}: ${insights.error.message}`
          )
        )
        continue
      }
      let report = `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}&form_factor=mobile`
      let indexable =
        insights.lighthouseResult.audits['is-crawlable']?.score === 1
      if (site.hidden && indexable) {
        results.push(
          fail(`Search engines can index ${short(url)}\n  ${link(report)}`)
        )
      } else if (!site.hidden && !indexable) {
        results.push(
          fail(`Search engines can not index ${short(url)}\n  ${link(report)}`)
        )
      } else if (site.hidden) {
        results.push(pass(`Search engines can not index ${short(url)}`))
      } else {
        results.push(pass(`Search engines can index ${short(url)}`))
      }
      for (let [id, category] of Object.entries(
        insights.lighthouseResult.categories
      )) {
        // Hidden sites always lose SEO points on asking to not index them
        if (id === 'seo' && site.hidden) continue
        let score = Math.round(category.score * 100)
        // Diagnostics have no weight in the score, but we still want them
        // green. Metrics are the score itself, so they would repeat it.
        let broken: string[] = []
        let ignored: string[] = []
        for (let ref of category.auditRefs) {
          let audit = insights.lighthouseResult.audits[ref.id]
          if (ref.group === 'metrics' || ref.group === 'hidden') continue
          if (!audit || audit.score === null || audit.score === 1) continue
          if (site.ignoreAudits?.[path]?.includes(ref.id)) {
            ignored.push(`  ${styleText('gray', `Ignored: ${audit.title}`)}`)
          } else {
            broken.push(`  ${styleText('red', audit.title)}`)
          }
        }
        let title = `${category.title} of ${short(url)} is ${grade(score)}`
        // App performance score jumps between runs on the same deploy
        if (
          score < (id === 'performance' && path === '/app' ? 90 : 100) ||
          broken.length > 0
        ) {
          results.push(
            fail([title, ...broken, ...ignored, `  ${link(report)}`].join('\n'))
          )
        } else {
          if (ignored.length > 0) ignored.push(`  ${link(report)}`)
          results.push(pass([title, ...ignored].join('\n')))
        }
      }
    }
  }
  return results.every(Boolean)
}
