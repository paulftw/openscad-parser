import CodeError from "./errors/CodeError";
import CodeWarning from "./errors/CodeWarning";

export default class ErrorCollector {
  errors: CodeError[] = [];
  warnings: CodeWarning[] = [];
  reportError<ET extends CodeError>(err: ET): ET {
    this.errors.push(err);
    return err;
  }
  /**
   * Reports a non-fatal warning. Unlike reportError, this does not throw and
   * does not prevent a valid AST from being returned by ParsingHelper.
   */
  reportWarning<WT extends CodeWarning>(warning: WT): WT {
    this.warnings.push(warning);
    return warning;
  }
  printErrors() {
    const msgs = this.errors.reduce((prev, e) => {
      return (
        prev +
        e.codeLocation.formatWithContext() +
        Object.getPrototypeOf(e).constructor.name +
        ": " +
        e.message +
        "\n"
      );
    }, "");
    console.log(msgs);
  }
  printWarnings() {
    const msgs = this.warnings.reduce((prev, w) => {
      return (
        prev +
        w.codeLocation.formatWithContext() +
        Object.getPrototypeOf(w).constructor.name +
        ": " +
        w.message +
        "\n"
      );
    }, "");
    console.log(msgs);
  }
  hasErrors() {
    return this.errors.length > 0;
  }
  hasWarnings() {
    return this.warnings.length > 0;
  }
  /**
   * Throws the first error on the list. Used to simplify testing.
   */
  throwIfAny() {
    if (this.errors.length > 0) {
      throw this.errors[0];
    }
  }
}
