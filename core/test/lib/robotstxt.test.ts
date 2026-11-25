import { deepEqual, equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { isAllowedByRules, parseRobots } from '../../lib/robotstxt.ts'

function allowed(robots: string, url: string): boolean {
  return isAllowedByRules(parseRobots(robots), url)
}

describe('robots.txt', () => {
  test('chooses own group or all robots group', () => {
    deepEqual(parseRobots(''), [])
    deepEqual(
      parseRobots(
        'User-agent: GoogleBot\nDisallow: /g\n\n' +
          'User-agent: *\nDisallow: /all\n'
      ),
      [[false, '/all']]
    )
    deepEqual(
      parseRobots(
        'User-agent: *\nDisallow: /\n\n' +
          'User-agent: SlowReader/1.0\nAllow: /\n'
      ),
      [[true, '/']]
    )
    deepEqual(
      parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: slowreader\n'),
      []
    )
    deepEqual(
      parseRobots('User-agent: slowreader\nDisallow:\nUser-agent: *\n'),
      []
    )
  })

  test('merges groups and shares rules of consecutive agents', () => {
    deepEqual(
      parseRobots(
        'User-agent: a\nUser-agent: *\nDisallow: /one\n' +
          'Sitemap: https://a.com/sitemap.xml\nDisallow: /two\n' +
          'User-agent: b\nDisallow: /b\n' +
          'user-AGENT: *\nallow: /three\n'
      ),
      [
        [false, '/one'],
        [false, '/two'],
        [true, '/three']
      ]
    )
  })

  test('ignores comments, line endings, BOM, and rules without agent', () => {
    deepEqual(
      parseRobots(
        '﻿Disallow: /before\r\n# Comment\r\n' +
          'User-agent: * # all\rDisallow: /a # rule\r\nwrong line\n'
      ),
      [[false, '/a']]
    )
  })

  test('checks URL by the longest rule', () => {
    let robots = 'User-agent: *\nDisallow: /blog\nAllow: /blog/posts\n'
    equal(allowed(robots, 'https://a.com/'), true)
    equal(allowed(robots, 'https://a.com/blog/1'), false)
    equal(allowed(robots, 'https://a.com/blog/posts/1'), true)
    equal(allowed('User-agent: *\nDisallow: /\n', 'https://a.com/'), false)
    equal(
      allowed('User-agent: *\nDisallow: /a\nAllow: /a\n', 'https://a.com/a'),
      true
    )
  })

  test('supports wildcards', () => {
    let robots = 'User-agent: *\nDisallow: /*.pdf$\nDisallow: /*?print\n'
    equal(allowed(robots, 'https://a.com/file.pdf'), false)
    equal(allowed(robots, 'https://a.com/file.pdf.html'), true)
    equal(allowed(robots, 'https://a.com/post?print=1'), false)
    equal(allowed(robots, 'https://a.com/post?id=1'), true)
    equal(allowed('User-agent: *\nDisallow: /$\n', 'https://a.com/'), false)
    equal(allowed('User-agent: *\nDisallow: /$\n', 'https://a.com/a'), true)
    equal(allowed('User-agent: *\nDisallow: /a*$\n', 'https://a.com/ab'), false)
    let many = `User-agent: *\nDisallow: /${'*a'.repeat(50)}b\n`
    equal(allowed(many, `https://a.com/${'a'.repeat(500)}`), true)
  })

  test('normalizes encoding', () => {
    equal(
      allowed('User-agent: *\nDisallow: /%7Euser\n', 'https://a.com/~user'),
      false
    )
    equal(
      allowed('User-agent: *\nDisallow: /~user\n', 'https://a.com/%7euser'),
      false
    )
    equal(
      allowed('User-agent: *\nDisallow: /статья\n', 'https://a.com/статья/1'),
      false
    )
    equal(
      allowed('User-agent: *\nDisallow: /a%2fb\n', 'https://a.com/a%2Fb'),
      false
    )
  })
})
