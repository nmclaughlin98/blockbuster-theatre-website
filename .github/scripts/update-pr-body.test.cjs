const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPullRequestBody } = require('./update-pr-body.cjs');

const template = [
  '## Commits',
  '<!-- pr-commits:start -->',
  '<!-- pr-commits:end -->',
  '',
  '## Summary (optional)',
  '',
  'Keep this summary.',
  '',
  '## Date',
  '<!-- pr-date:start -->',
  '<!-- pr-date:end -->',
].join('\n');

test('updates commits and creation date while preserving the optional summary', () => {
  const body = buildPullRequestBody(template, [{
    sha: '1234567890abcdef',
    commit: { message: 'Add booking flow\n\nMore details' },
  }], '2026-10-20T19:30:00Z');

  assert.match(body, /- `1234567` Add booking flow/);
  assert.match(body, /Keep this summary\./);
  assert.match(body, /2026-10-20/);
});

test('renders an empty commit list without removing template sections', () => {
  const body = buildPullRequestBody(template, [], '2026-10-20T19:30:00Z');

  assert.match(body, /- No commits yet\./);
  assert.match(body, /## Summary \(optional\)/);
  assert.match(body, /2026-10-20/);
});

test('does not update bodies without the automation markers', () => {
  assert.equal(buildPullRequestBody('## Summary only', [], '2026-10-20T19:30:00Z'), null);
});
