import { config } from "../index";
import type { ParsedEnvs } from "../index";

const root = process.cwd();

describe("Config Method", () => {
  it("loads a default .env file", () => {
    const { extracted } = config();

    expect(extracted).toEqual(
      expect.objectContaining({
        ROOT: "true"
      })
    );
  });

  it("accepts a dir argument as a string", () => {
    const { extracted } = config({ dir: "tests" });

    expect(extracted).toEqual(
      expect.objectContaining({
        BASIC: "basic"
      })
    );
  });

  it("accepts a paths argument as an array", () => {
    const { extracted } = config({ paths: ["tests/.env.path"] });

    expect(extracted).toEqual(
      expect.objectContaining({
        SNACKS: "true"
      })
    );
  });

  it("accepts an encoding argument", () => {
    const { extracted } = config({
      dir: "tests",
      paths: [".env.utf8"],
      encoding: "utf-8"
    });

    expect(extracted).toEqual(
      expect.objectContaining({
        UTF8: "true"
      })
    );
  });

  it("accepts a debug argument", () => {
    const spy = jest.spyOn(console, "log").mockImplementation();

    config({ paths: ["tests/.env.basic"], debug: true });

    expect(spy.mock.calls[0][0]).toContain(
      `Loaded env from ${root}/tests/.env.basic`
    );

    config({ paths: ["tests/.env.invalid"], debug: true });

    spy.mockRestore();
  });

  it("allows non-existent files to silently fail", () => {
    const spy = jest.spyOn(console, "log").mockImplementation();

    config({ paths: ["tests/.env.invalid"] });

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  describe("Interpolation", () => {
    let extracted: ParsedEnvs;
    beforeAll(() => {
      process.env.MACHINE = "node";
      extracted = config({ paths: ["tests/.env.interp"] }).extracted;
    });

    it("interops .env keys", () => {
      expect(extracted).toEqual(
        expect.objectContaining({
          BASIC_EXPAND: "basic",
          BASIC_EMPTY: ""
        })
      );
    });

    it("interops and prioritizes process.env keys over .env keys", () => {
      expect(extracted).toEqual(
        expect.objectContaining({
          MACHINE_EXPAND: "node"
        })
      );
    });

    it("interops undefined keys", () => {
      expect(extracted).toEqual(
        expect.objectContaining({
          UNDEFINED_EXPAND: ""
        })
      );
    });

    it("interops mixed ENV with or without brackets values", () => {
      expect(extracted).toEqual(
        expect.objectContaining({
          MONGOLAB_URI:
            "mongodb://root:password@abcd1234.mongolab.com:12345/localhost",
          MONGOLAB_URI_RECURSIVELY:
            "mongodb://root:password@abcd1234.mongolab.com:12345/localhost",
          MONGOLAB_USER: "root",
          MONGOLAB_USER_RECURSIVELY: "root:password",
          UNDEFINED_EXPAND: "",
          WITHOUT_CURLY_BRACES_URI:
            "mongodb://root:password@abcd1234.mongolab.com:12345/localhost",
          WITHOUT_CURLY_BRACES_URI_RECURSIVELY:
            "mongodb://root:password@abcd1234.mongolab.com:12345/localhost",
          WITHOUT_CURLY_BRACES_USER_RECURSIVELY: "root:password"
        })
      );
    });

    it("doesn't interp escaped $ keys", () => {
      expect(extracted).toEqual(
        expect.objectContaining({
          ESCAPED_EXPAND: "$ESCAPED",
          ESCAPED_TITLE: "There are $nakes in my boot$"
        })
      );
    });
  });

  it("overwrites keys in other .envs but not ENVs already defined in process.env", () => {
    const AUTHOR = "Matt";
    process.env.AUTHOR = AUTHOR;

    const { extracted, parsed } = config({
      paths: ["tests/.env.write", "tests/.env.overwrite"]
    });

    expect(extracted).toEqual(
      expect.objectContaining({
        WRITE: "false"
      })
    );

    expect(parsed.AUTHOR).toEqual(AUTHOR);
  });

  it("throws a warning if loading the .env fails", () => {
    const spy = jest.spyOn(console, "log").mockImplementation();

    config({
      paths: ["tests/.env.utf8"],
      // @ts-ignore
      encoding: "bad"
    });

    expect(spy.mock.calls[0][0]).toContain(
      `Unable to load ${root}/tests/.env.utf8`
    );

    spy.mockRestore();
  });
});
