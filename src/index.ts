#!/usr/bin/env node
import {BigQuery} from '@google-cloud/bigquery';
import * as meow from 'meow';
import * as updateNotifier from 'update-notifier';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');
updateNotifier({pkg}).notify();
const cli = meow(
  `
  Usage
    $ promotime GITHUB_USERNAME [--arguments]

  Positional arguments

    GITHUB_USERNAME
      The GitHub Username of the account to run a report on.

  Flags

    --start=START_DATE
        The start date in 'YYYY-MM-DDDD' format.

    --end=END_DATE
        The end date in 'YYYY-MM-DDDD' format.

    --help
        Show this command.

  Examples
    $ promotime JustinBeckwith --start 2011-01-01 --end 2019-03-01
`,
  {
    flags: {
      start: {type: 'string'},
      end: {type: 'string'},
    },
  }
);

interface Results {
  pullRequestsCreated?: number;
  codeReviewsCompleted?: number;
  issuesClosed?: number;
  pullRequestCommentsMade?: number;
}

async function main() {
  if (cli.input.length !== 1) {
    cli.showHelp();
    return;
  }
  const user = cli.input[0];
  const bq = new BigQuery();
  let query = `SELECT * FROM \`githubarchive.month.*\` WHERE actor.login='${user}'`;
  if (cli.flags.start) {
    query += ` AND created_at > '${cli.flags.start}'`;
  }
  if (cli.flags.end) {
    query += ` AND created_at < '${cli.flags.end}'`;
  }
  console.log(query);
  const [data] = await bq.query(query);
  const results = {} as Results;

  // Get # of pull requests opened
  results.pullRequestsCreated = data.filter(x => {
    if (x.type === 'PullRequestEvent') {
      const payload = JSON.parse(x.payload);
      return payload.action === 'opened';
    }
    return false;
  }).length;

  // Get # of pull request comments
  results.pullRequestCommentsMade = data.filter(x => {
    return x.type === 'PullRequestReviewCommentEvent';
  }).length;

  // Get # of issues closed
  results.issuesClosed = data.filter(x => {
    if (x.type === 'IssuesEvent') {
      const payload = JSON.parse(x.payload);
      return payload.action === 'closed';
    }
    return false;
  }).length;

  console.log(results);
}

main();
