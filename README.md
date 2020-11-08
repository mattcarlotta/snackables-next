![snackablesLogo](https://github.com/mattcarlotta/snackables/blob/main/snackablesLogo.png?raw=true)

<p align="center">
  <a href="https://www.npmjs.com/package/snackables-next">
    <img src="https://img.shields.io/npm/v/snackables-next.svg?style=for-the-badge&labelColor=000000">
  </a>
  <a href="https://github.com/mattcarlotta/snackables-next/actions?query=workflow%3A%22Publish+Workflow%22">
    <img src="https://img.shields.io/github/workflow/status/mattcarlotta/snackables-next/Publish%20Workflow?style=for-the-badge&labelColor=000000">
  </a>
  <a href="https://codecov.io/gh/mattcarlotta/snackables-next/branch/main">
    <img src="https://img.shields.io/codecov/c/github/mattcarlotta/snackables-next?style=for-the-badge&labelColor=000000">
  </a>
  <a href="https://github.com/mattcarlotta/snackables-next/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/snackables-next.svg?style=for-the-badge&labelColor=000000">
  </a>
  <a href="https://www.npmjs.com/package/snackables-next">
    <img src="https://img.shields.io/npm/dm/snackables-next?style=for-the-badge&labelColor=000000">
  </a>
</p>

Heavily inspired by [dotenv](https://github.com/motdotla/dotenv) and [dotenv-expand](https://github.com/motdotla/dotenv-expand), snackables-next is a simple to use [zero-dependency](https://bundlephobia.com/result?p=snackables-next@) package module that handles parsing, caching, and assigning one or many `.env` files for [NextJS](https://github.com/vercel/next.js).

## Quick Links

[Installation](#installation)

[Usage](#usage)

[Config Method](#config-method)
  - [Argument Options](#config-argument-options)
    - [dir](#config-dir)
    - [paths](#config-paths)
    - [encoding](#config-encoding)
    - [cache](#config-cache)
    - [debug](#config-debug)

[Parse Method](#parse-method)
  - [Argument Options](#parse-argument-options)
    - [src](#parse-src)
    - [cache](#parse-cache)
  - [Rules](#parse-rules)

[Interpolation](#interpolation)
  - [Interpolation Rules](#interpolation-rules)

[FAQ](#faq)
  - [Should I commit my .env files?](#should-i-commit-my-env-files)
  - [How does snackables work and will it override already set or predefined variables?](#how-does-snackables-work-and-will-it-override-already-set-or-predefined-variables)
  - [Why doesn't the parse method automatically assign Envs?](#why-doesnt-the-parse-method-automatically-assign-envs)

[Contributing Guide](#contributing-guide)

[Updates Log](#updates-log)

## Installation

```bash
# with npm
npm install snackables

# or with Yarn
yarn add snackables
```

## Usage

You must `require`/`import` the snackables package as early as possible and invoke the [Config method](#config-method):

```javascript
require("snackables").config({ paths: ["custom/path/to/.env"] });
// import { config } from 'snackables';
// config({ paths: ["custom/path/to/.env"] });

```

## Config Method

By invoking the config method, it will read your `.env` files, parse the contents, assign them to [`process.env`](https://nodejs.org/docs/latest/api/process.html#process_process_env), and return an `Object` with `parsed`, `extracted` and `cachedEnvFiles` properties (the [cache](#config-cache) argument of `config` **must** be set to true for `cachedEnvFiles` to be utilized):

```js
const result = snackables.config();

console.log("parsed", result.parsed); // process.env with loaded Envs
console.log("extracted", result.extracted); // extracted Envs within a { KEY: VALUE } object
console.log("cachedEnvFiles", result.cachedEnvFiles); // array of file path and file parsed contents objects: [{ path: "path/to/.env", contents: parsed contents as encoded string }] 
```

Additionally, you can pass options to `config`.

### Config Argument Options

config accepts a single `Object` argument with the following properties: 
```js
{ 
  dir?: string, 
  paths?: string[], 
  encoding?: BufferEncoding,
  cache?: string | boolean,
  debug?: string | boolean
}
```

#### Config dir

Default: `process.cwd()` (root directory)

You may specify a single directory path if your files are located elsewhere.

A single directory path as a `string`:

```js
require("snackables").config({ dir: "path/to/directory" });

// import { config } from "snackables"
// config({ dir: "path/to/directory" });
```

#### Config paths

Default: `[".env"]`

You may specify custom paths if your files are located elsewhere (recommended to use **absolute** path(s) from your root directory).

A single file or multiple file paths as an `array` of `string`s:

```js
require("snackables").config({ paths: ["custom/path/to/.env", "custom/path/to/.env.base"] });

// import { config } from "snackables"
// config({ paths: ["custom/path/to/.env", "custom/path/to/.env.base"] });
```

This can also be combined with the [Config dir](#config-dir) argument to simplify custom paths:

```js
require("snackables").config({ dir: "custom/path/to", paths: [".env", ".env.base"] });

// import { config } from "snackables"
// config({ dir: "custom/path/to", paths: [".env", ".env.base"] });
```

#### Config encoding

Default: `utf-8`

You may specify the encoding [type](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) of your file containing environment variables.

```js
require("snackables").config({ encoding: "latin1" });

// import { config } from "snackables"
// config({ encoding: "latin1" });
```

#### Config cache

Default: `false`

You may specify whether or not to temporarily cache `.env` files once they're loaded. This is useful if you're importing snackables multiple times and attempting to load a file more than once. If the cache contains the loaded `.env` file, it will be skipped. This also works for reloading cached files using [parse](#parse-method) if the `process.env` happens to be reset to a default state.

```js
require("snackables").config({ cache: true });

// import { config } from "snackables"
// config({ cache: true });
```


#### Config debug

Default: `false`

You may turn on logging to help debug file loading.

```js
require("snackables").config({ debug: process.env.DEBUG });

// import { config } from "snackables"
// config({ debug: process.env.DEBUG });
```

## Parse Method

If you wish to manually parse Envs from a Buffer or file or cache, then parse will read a string, Buffer, or even CachedEnvFiles and parse/assign their contents.

### Parse Argument Options

parse accepts one argument: 
```
src: string | Buffer | CacheEnvFiles, 
```

#### Parse src

For most use cases, you'll want to pass parse a `string` or `Buffer` as the first argument which returns an `extracted` or `sanitized` parsed keys/values as a single `Object` (these will **NOT** be assigned to `process.env`. [Why not?](#why-doesnt-the-parse-method-automatically-assign-envs)). 

```js
const { readFileSync } = require("fs");
const { parse } = require("snackables");
// import { readFileSync } from "fs";
// import { parse } from "snackables";

const config = parse(Buffer.from("BASIC=basic")); // will return an object
console.log(typeof config, config); // object { BASIC : 'basic' }

const results = parse(readFileSync("path/to/.env.file", { encoding: "utf8" })); // will return an object
console.log(typeof results, results); // object { KEY : 'value' }
```


#### Parse cache

For edge cases, the parse method also accepts the `cachedEnvFiles` array (returned by [config](#config-method)) as the first argument if the following requirements are met: 

The [cache](#config-cache) argument is set to `true` when the `config` method is used and `process.env.LOADED_CACHE` is not defined. 


If the above requirements are met, parse will **reapply** cached Envs properties to `process.env` and return `process.env`. 

```js
const { config, parse } = require("snackables");
// import { config, parse } from "snackables";

// loads ".env.base" and ".env.dev" to process.env and returns an array of cached env objects
// cachedEnvFiles = [{ path: "path/to/.env", contents: parsed contents as encoded string  }]
const { cachedEnvFiles } = config({ paths: [".env.base", ".env.dev"], cache: true }); 

// parses and reapplies cached Envs if the process.env.PROPERTY is undefined
// returns process.env with any reapplied Envs from cache
const reappliedProcessEnv = parse(cachedEnvFiles); 
console.log(reappliedProcessEnv) 

// this lets snackables know not to reload from cache
process.env.LOADED_CACHE = "true"; 

// since process.env.LOADED_CACHE is defined, cache is skipped and process.env is returned as is
const originalProcessEnv = parse(cachedEnvFiles); 
console.log(originalProcessEnv) 
```

### Parse Rules

The parsing method currently supports the following rules:

- `BASIC=basic` becomes `{BASIC: 'basic'}`
- empty lines are skipped
- lines beginning with `#` are treated as comments
- empty values become empty strings (`EMPTY=` becomes `{EMPTY: ''}`)
- inner quotes are maintained (think JSON) (`JSON={"foo": "bar"}` becomes `{JSON:"{\"foo\": \"bar\"}"`)
- whitespace is removed from both ends of unquoted values (see more on [`trim`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/string/Trim)) (`FOO= some value ` becomes `{FOO: 'some value'}`)
- single and double quoted values are escaped (`SINGLE_QUOTE='quoted'` becomes `{SINGLE_QUOTE: "quoted"}`)
- single and double quoted values maintain whitespace from both ends (`FOO=" some value "` becomes `{FOO: ' some value '}`)
- double quoted values expand new lines (`MULTILINE="new\nline"` becomes

```
{MULTILINE: 'new
line'}
```

## Interpolation

You may want to interpolate ENV values based upon a `process.env` value or a key within the `.env` file. To interpolate a value, simply define it with `$KEY` or `${KEY}`, for example:

Input:
```dosini
MESSAGE=Hello
INTERP_MESSAGE=$MESSAGE World
INTERP_MESSAGE_BRACKETS=${MESSAGE} World
ENVIRONMENT=$NODE_ENV
```

Output:
```dosini
MESSAGE=Hello
INTERP_MESSAGE=Hello World
INTERP_MESSAGE_BRACKETS=Hello World
ENVIRONMENT=development
```

### Interpolation Rules

- Values can be interpolated based upon a `process.env` value: `BASIC=$NODE_ENV` || `BASIC=${NODE_ENV}`
- Values in `process.env` take precedence over interpolated values in `.env` files
- Interpolated values can't be referenced across multiple `.env`s, instead they must only be referenced within the same file
- The `$` character **must** be escaped when it doesn't refer to another key within the `.env` file: `\$1234`
- Do not use escaped `\$` within a value when it's key is referenced by another key: 

Input:
```dosini
A=\$example
B=$A
```

Output:
```dosini
A=$example
B=
```

Fix:
```dosini
A=example
B=\$$A
```

Output:
```dosini
A=example
B=$example
```

## FAQ

### Should I commit my `.env` files?

No. It's **strongly** recommended not to commit your `.env` files to version control. It should only include environment-specific values such as database passwords or API keys. Your production database should have a different password than your development database.

### How does snackables work and will it override already set or predefined variables?

By default, snackables will look for the `.env.*` file(s) defined within the [Config paths](#config-paths) argument to `config` and append them to `process.env`.

For example:

```js
require("snackables").config({ paths: [".env.base", ".env.dev"] });

// import { config } from "snackables"
// config({ paths: [".env.base", ".env.dev"] });
```

in a local enviroment, `.env.base` may have static shared database variables:

```dosini
DB_HOST=localhost
DB_USER=root
DB_PASS=password
```

while `.env.dev` may have environment specific variables:

```dosini
DB_PASS=password123
HOST=http://localhost
PORT=3000
```

snackables will parse the files and extract the Envs in the order of how they were defined in `paths`. In the example above, the `DB_PASS` variable within `.env.base` would be overidden by `.env.dev` because `.env.dev` file was imported last and, as a result, its `DB_PASS` will be assigned to `process.env`.

Envs that are **pre-set** or become **defined** within `process.env` **WILL NOT be overidden**. No exceptions.

### Why doesn't the parse method automatically assign Envs?

With the exception of assigning pre-cached Envs (which don't require any Env interpretation/interpolation), `parse` can not automatically assign Envs as they're extracted.

Why?

Under the hood, the `config` method utilizes the `parse` method to extract one or multiple `.env` files as it loops over the config's [path](#config-path)s argument. The `config` method expects `parse` to return a single `Object` of `extracted` Envs that will be accumulated with other files' extracted Envs. The result of these accumulated Envs is then assigned to `process.env` **once** -- this approach has the added benefit of prioritizing Envs without using **any** additional logic since the last set of extracted Envs automatically override any previous Envs (thanks to [Object.assign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Merging_objects_with_same_properties)). While allowing Envs to be assigned multiple times to `process.env` doesn't appear to be much different in terms of performance, it requires a bit more additional overhead logic to determine which `.env` has priority and whether or not to *conditionally* apply them (including times when you might want to parse Envs, but not neccesarily assign them).

## Contributing Guide

See [CONTRIBUTING.md](CONTRIBUTING.md)

## Updates Log

See [UPDATESLOG.md](UPDATESLOG.md)
