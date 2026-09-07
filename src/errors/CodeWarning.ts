import CodeLocation from "../CodeLocation";

/**
 * A root class for all the non-fatal warnings generated during parsing and lexing.
 * Unlike CodeError, a CodeWarning does not abort parsing - it is collected
 * alongside the resulting AST.
 * @category Warning
 */
export default abstract class CodeWarning {
  constructor(public codeLocation: CodeLocation, public message: string) {}
}
