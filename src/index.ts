#!/usr/bin/env node
import fs from 'node:fs';
import { BigQuery } from '@google-cloud/bigquery';
import meow from 'meow';
import updateNotifier, { type Package } from 'update-notifier';

export type Results = {
  pullRequestsCreated?: number;
  codeReviewsCompleted?: number;
  issuesClosed?: number;
  pullRequestCommentsMade?: number;
};

export type Payload = {
  action: string;
};

export type QueryResult = {
  type: string;
  payload: string;
};

export const helpMessage = `
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
`;

export function buildQuery(
  user: string,
  startDate?: string,
  endDate?: string,
): string {
  let query = `SELECT * FROM \`githubarchive.month.*\` WHERE actor.login='${user}'`;
  if (startDate) {
    query += ` AND created_at > '${startDate}'`;
  }
  if (endDate) {
    query += ` AND created_at < '${endDate}'`;
  }
  return query;
}

export function processResults(data: QueryResult[]): Results {
  const results: Results = {};

  // Get # of pull requests opened
  results.pullRequestsCreated = data.filter((x) => {
    if (x.type === 'PullRequestEvent') {
      const payload = JSON.parse(x.payload) as Payload;
      return payload.action === 'opened';
    }
    return false;
  }).length;

  // Get # of pull request comments
  results.pullRequestCommentsMade = data.filter((x) => {
    return x.type === 'PullRequestReviewCommentEvent';
  }).length;

  // Get # of issues closed
  results.issuesClosed = data.filter((x) => {
    if (x.type === 'IssuesEvent') {
      const payload = JSON.parse(x.payload) as Payload;
      return payload.action === 'closed';
    }
    return false;
  }).length;

  return results;
}

export interface MainOptions {
  username?: string;
  startDate?: string;
  endDate?: string;
  queryFn?: (query: string) => Promise<QueryResult[]>;
}

export async function main(options: MainOptions = {}) {
  if (!options.username) {
    /* c8 ignore next 3 */
    const package_ = JSON.parse(
      fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as Package;
    /* c8 ignore next */
    updateNotifier({ pkg: package_ }).notify();

    const cli = meow({
      importMeta: import.meta,
      help: helpMessage,
      flags: {
        start: { type: 'string' },
        end: { type: 'string' },
      },
    });

    if (cli.input.length !== 1) {
      cli.showHelp();
      return;
    }

    options.username = cli.input[0];
    options.startDate = cli.flags.start;
    options.endDate = cli.flags.end;
  }

  const user = options.username;
  if (!user) {
    throw new Error('Username is required');
  }

  const query = buildQuery(user, options.startDate, options.endDate);

  let data: QueryResult[];
  /* c8 ignore start */
  if (!options.queryFn) {
    const bq = new BigQuery();
    console.log(query);
    const [rawData] = await bq.query(query);
    data = rawData as QueryResult[];
    const results = processResults(data);
    console.log(results);
    return results;
  }
  /* c8 ignore stop */

  data = await options.queryFn(query);
  const results = processResults(data);
  return results;
}

// Run main only if this is the entry point
/* c8 ignore next 3 */
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
