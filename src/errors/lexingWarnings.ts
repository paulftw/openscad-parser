import CodeLocation from "../CodeLocation";
import LexingWarning from "./LexingWarning";

/**
 * Mirrors real OpenSCAD's lexer, which logs "Undefined escape sequence" and
 * drops the backslash instead of failing to parse the file.
 * @category Warning
 */
export class UndefinedEscapeSequenceLexingWarning extends LexingWarning {
  constructor(pos: CodeLocation, sequence: string) {
    super(pos, `Undefined escape sequence '${sequence}'.`);
  }
}
