/**
 * @license
 * BSD 2-Clause "Simplified" License
 *
 * Copyright (c) 2015, Scott Motte
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import { readFileSync, statSync } from "fs";
import { join } from "path";

export interface ParsedEnvs {
  [name: string]: string; // parsed Envs as KEY=VALUE pairs
}

export interface ProcessEnv {
  [key: string]: string; // process.env
}

export type CachedEnvFiles = Array<{
  path: string; // loaded .env file path
  contents: string; // parsed file to buffer string
}>;

export type Option = string | boolean | undefined;

export type Path = string[];

export interface ConfigOptions {
  dir?: string; // directory to env files
  paths?: Path; // paths to .env files
  encoding?: BufferEncoding; // encoding of .env file
  cache?: Option; // turn on caching
  debug?: Option; // turn on logging for debugging purposes
}

export interface ConfigOutput {
  parsed: ProcessEnv; // process.env Envs as key value pairs
  extracted: ParsedEnvs; // extracted Envs as key value pairs
  cachedEnvFiles: CachedEnvFiles; // cached Envs as key value pairs
}

const __CACHE__: CachedEnvFiles = [];

/**
 * Parses a string, buffer, or precached envs into an object.
 *
 * @param src - contents to be parsed (string | Buffer | CachedEnvFiles)
 * @returns an object with keys and values from `src`
 */
export function parse(src: string | Buffer | CachedEnvFiles): ParsedEnvs {
  const { env } = process;
  const { LOADED_CACHE } = env;
  const { assign } = Object;

  // initialize extracted Envs object
  const extracted: ParsedEnvs = {};

  // checks if src is an array of precached Envs
  if (Array.isArray(src)) {
    // checks if process.env.LOADED_CACHE is undefined, otherwise skip reloading
    if (!LOADED_CACHE)
      for (let i = 0; i < src.length; i += 1) {
        assign(extracted, JSON.parse(Buffer.from(src[i].contents).toString()));
      }
    return assign(env, extracted);
  }

  function interpolate(envValue: string): string {
    // find interpolated values with $KEY or ${KEY}
    const matches = envValue.match(/(.?\${?(?:[a-zA-Z0-9_]+)?}?)/g);

    return !matches
      ? envValue
      : matches.reduce((newEnv: string, match: string): string => {
          // parts = ["$string", "@"| ":" | "/", " ", "strippedstring", index: n, input: "$string", groups ]
          const parts = /(.?)\${?([a-zA-Z0-9_]+)?}?/g.exec(match);

          /* istanbul ignore next */
          if (!parts) return newEnv;

          let value, replacePart;

          // if prefix is escaped
          if (parts[1] === "\\") {
            // remove escaped characters
            replacePart = parts[0];
            value = replacePart.replace("\\$", "$");
          } else {
            // else remove prefix character
            replacePart = parts[0].substring(parts[1].length);
            // interpolate value from process or extracted object or empty string
            value = interpolate(env[parts[2]] || extracted[parts[2]] || "");
          }

          return newEnv.replace(replacePart, value.trim());
        }, envValue);
  }

  // converts Buffers before splitting into lines and processing
  const keyValues = src.toString().split(/\n|\r|\r\n/);

  // loops over key value pairs
  for (let i = 0; i < keyValues.length; i += 1) {
    // finds matching "KEY' and 'VAL' in 'KEY=VAL'
    const keyValueArr = keyValues[i].match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);

    // prevents the extracted value from overriding a process.env variable
    if (keyValueArr && !env[keyValueArr[1]]) {
      // default undefined or missing values to empty string
      let value = keyValueArr[2] || "";
      const end = value.length - 1;
      const isDoubleQuoted = value[0] === '"' && value[end] === '"';
      const isSingleQuoted = value[0] === "'" && value[end] === "'";

      // if single or double quoted, remove quotes
      if (isSingleQuoted || isDoubleQuoted) {
        value = value.substring(1, end);

        // if double quoted, expand newlines
        if (isDoubleQuoted) value = value.replace(/\\n/g, "\n");
      }

      // interpolate value from .env
      extracted[keyValueArr[1]] = interpolate(value);
    }
  }

  return extracted;
}

/**
 * Extracts and interpolates one or multiple `.env` files into an object and assigns them to {@link https://nodejs.org/api/process.html#process_process_env | `process.env`}.
 * Example: 'KEY=value' becomes { KEY: 'value' }
 *
 * @param options - accepts: { dir: string, paths: string[], encoding: | "ascii" | "utf8" | "utf-8" | "utf16le" | "ucs2" | "ucs-2" | "base64" | "latin1" | "binary"| "hex", cache: string | boolean, debug: string | boolean }
 * @returns a single parsed object with parsed Envs as { key: value } pairs, a single extracted object with extracted Envs as { key: value } pairs, and an array of cached Envs as { path: string, contents: string } pairs
 */
export function config(options?: ConfigOptions): ConfigOutput {
  const { log } = console;
  const { assign } = Object;

  // default config options
  let dir = process.cwd();
  let paths: Path = [".env"];
  let debug: Option;
  let encoding: BufferEncoding = "utf-8";
  let cache: Option;

  // override default options with config options arguments
  if (options) {
    dir = options.dir || dir;
    paths = options.paths || paths;
    debug = options.debug;
    encoding = options.encoding || encoding;
    cache = options.cache;
  }

  // initializes parsed Env object
  const extracted: ParsedEnvs = {};

  // loop over configs array
  for (let i = 0; i < paths.length; i += 1) {
    // gets config path file
    const envPath = join(dir, paths[i]);
    try {
      // check that the file hasn't already been cached
      if (
        !cache ||
        (!__CACHE__.some(({ path }) => path === envPath) && cache)
      ) {
        // checks if "envPath" is a file that exists
        statSync(envPath).isFile();

        // reads and parses Envs from .env file
        const parsed = parse(readFileSync(envPath, { encoding }));

        // stores path and parsed file contents to internal cache
        if (cache)
          __CACHE__.push({
            path: envPath,
            contents: Buffer.from(JSON.stringify(parsed)).toString()
          });

        // assigns Envs to accumulated object
        assign(extracted, parsed);

        if (debug) log(`\x1b[90mLoaded env from ${envPath}\x1b[0m`);
      }
    } catch (err) {
      if (err.code !== "ENOENT") {
        log(`\x1b[33mUnable to load ${envPath}: ${err.message}.\x1b[0m`);
      }
    }
  }

  return {
    parsed: assign(process.env, extracted),
    extracted,
    cachedEnvFiles: __CACHE__
  };
}
