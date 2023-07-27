# P-R-O-M-O-T-I-M-E
> A tool for gathering GitHub stats!

[![npm version](https://img.shields.io/npm/v/promotime.svg)](https://www.npmjs.org/package/promotime)
[![codecov](https://codecov.io/gh/JustinBeckwith/promotime/branch/main/graph/badge.svg)](https://codecov.io/gh/JustinBeckwith/promotime)
[![Known Vulnerabilities](https://snyk.io/test/github/JustinBeckwith/promotime/badge.svg)](https://snyk.io/test/github/JustinBeckwith/promotime)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![XO code style](https://shields.io/badge/code_style-5ed9c7?logo=xo&labelColor=gray)](https://github.com/xojs/xo)

## Installation

```sh
$ npm install -g promotime
```

## Usage

```sh
# Get your aggregate stats for the last year
$ promotime JustinBeckwith --start 2018-03-01 --end 2019-03-01
```

## Sample Output

```sh
SELECT * FROM `githubarchive.month.*` WHERE actor.login='JustinBeckwith' AND created_at > '2018-03-01' AND created_at < '2019-03-01'
{ pullRequestsCreated: 2389,
  pullRequestCommentsMade: 1026,
  issuesClosed: 2833 }
```

## Authentication
For now, this uses the Google Cloud SDK for authentication. I know, that's less than ideal.  If anyone wants, I can add the code to do OAuth2 based auth.
- Make sure you have the [Cloud SDK](https://cloud.google.com/sdk) installed.
- `$ gcloud auth login`
- `$ gcloud auth application-default login`

## License
[MIT](LICENSE.md)
