#!/usr/bin/env node
import fs from 'node:fs';
import {BigQuery} from '@google-cloud/bigquery';
import meow from 'meow';
import updateNotifier, {type Package} from 'update-notifier';

const pkg = JSON.parse(
	fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
) as Package;
updateNotifier({pkg}).notify();

const helpMessage = `
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

const cli = meow({
	importMeta: import.meta,
	help: helpMessage,
	flags: {
		start: {type: 'string'},
		end: {type: 'string'},
	},
});

type Results = {
	pullRequestsCreated?: number;
	codeReviewsCompleted?: number;
	issuesClosed?: number;
	pullRequestCommentsMade?: number;
};

type Payload = {
	action: string;
};

type QueryResult = {
	type: string;
	payload: string;
};

if (cli.input.length !== 1) {
	cli.showHelp();
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
const [rawData] = await bq.query(query);
const data = rawData as QueryResult[];
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

console.log(results);
