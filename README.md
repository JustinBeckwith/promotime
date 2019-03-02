# P-R-O-M-O-T-I-M-E
> A tool for gathering GitHub stats!

[![npm version](https://img.shields.io/npm/v/promotime.svg)](https://www.npmjs.org/package/promotime)
[![Build Status](https://api.cirrus-ci.com/github/JustinBeckwith/promotime.svg)](https://cirrus-ci.com/github/JustinBeckwith/promotime)
[![codecov](https://codecov.io/gh/JustinBeckwith/promotime/branch/master/graph/badge.svg)](https://codecov.io/gh/JustinBeckwith/promotime)
[![Dependency Status](https://img.shields.io/david/JustinBeckwith/promotime.svg)](https://david-dm.org/JustinBeckwith/promotime)
[![Known Vulnerabilities](https://snyk.io/test/github/JustinBeckwith/promotime/badge.svg)](https://snyk.io/test/github/JustinBeckwith/promotime)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Code Style: Google](https://img.shields.io/badge/code%20style-google-blueviolet.svg)](https://github.com/google/gts)

## Installation

```sh
$ npm install -g promotime
```

## Usage

```sh
# Get your aggregate stats for the last year
$ promotime JustinBeckwith --start 2018-03-01 --end 2019-03-01
```

## Authentication
For now, this uses the Google Cloud SDK for authentication. I know, that's lame.  If anyone wants, I can add the code to do OAuth2 based auth.
- Make sure you have the [Cloud SDK](https://cloud.google.com/sdk) installed.
- `$ gcloud auth login`
- `$ gcloud auth application-default login`

## License
[MIT](LICENSE.md)
