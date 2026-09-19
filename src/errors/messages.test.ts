import CodeLocation from "../CodeLocation";
import TokenType from "../TokenType";
import { IncludedFileNotFoundError, UsedFileNotFoundError } from "../semantic/IncludeResolver";
import * as unresolvedSymbolErrors from "../semantic/unresolvedSymbolErrors";
import * as lexingErrors from "./lexingErrors";
import * as lexingWarnings from "./lexingWarnings";
import * as parsingErrors from "./parsingErrors";

type Ctor = new (...args: any[]) => { message: string };

const classes: [string, Ctor][] = [
  lexingErrors,
  lexingWarnings,
  parsingErrors,
  unresolvedSymbolErrors,
  { IncludedFileNotFoundError, UsedFileNotFoundError },
].flatMap((mod) =>
  Object.entries(mod).filter(
    (entry): entry is [string, Ctor] => typeof entry[1] === "function"
  )
);

// Classes whose last constructor argument is free text supplied by the caller,
// so they need real arguments rather than the placeholder ones.
const args: Record<string, unknown[]> = {
  UnexpectedTokenParsingError: [new CodeLocation(), TokenType.Comma],
};

describe("error and warning messages", () => {
  it("finds every error and warning class", () => {
    expect(classes.length).toBeGreaterThanOrEqual(30);
  });
  it.each(classes)("%s ends with a period", (name, Cls) => {
    const pos = new CodeLocation();
    const { message } = new Cls(...(args[name] ?? [pos, "x", "x", "x"]));
    expect(message).toMatch(/\.$/);
  });
  it("quotes the whole filename of a file that was not found", () => {
    const pos = new CodeLocation();
    expect(new IncludedFileNotFoundError(pos, "a.scad").message).toEqual(
      "Included file 'a.scad' not found."
    );
    expect(new UsedFileNotFoundError(pos, "a.scad").message).toEqual(
      "Used file 'a.scad' not found."
    );
  });
});
