import CodeFile from "./CodeFile";
import CodeLocation from "./CodeLocation";
import ErrorCollector from "./ErrorCollector";
import { UnexpectedCharacterLexingError } from "./errors/lexingErrors";
import { UndefinedEscapeSequenceLexingWarning } from "./errors/lexingWarnings";

describe("ErrorCollector", () => {
  it("prints the errors to the console", () => {
    const ec = new ErrorCollector();
    ec.reportError(
      new UnexpectedCharacterLexingError(
        new CodeLocation(new CodeFile("/test.scad", "test"), 21, 37),
        "^"
      )
    );
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    ec.printErrors();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("^"));
  });

  it("keeps warnings separate from errors", () => {
    const ec = new ErrorCollector();
    expect(ec.hasErrors()).toBe(false);
    expect(ec.hasWarnings()).toBe(false);

    ec.reportWarning(
      new UndefinedEscapeSequenceLexingWarning(
        new CodeLocation(new CodeFile("/test.scad", "test"), 21, 37),
        "q"
      )
    );

    expect(ec.hasWarnings()).toBe(true);
    expect(ec.warnings).toHaveLength(1);
    expect(ec.hasErrors()).toBe(false);
    expect(ec.errors).toHaveLength(0);
  });

  it("prints the warnings to the console", () => {
    const ec = new ErrorCollector();
    ec.reportWarning(
      new UndefinedEscapeSequenceLexingWarning(
        new CodeLocation(new CodeFile("/test.scad", "test"), 21, 37),
        "q"
      )
    );
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    ec.printWarnings();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("q"));
  });
});
