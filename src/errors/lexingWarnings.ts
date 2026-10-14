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

/**
 * Mirrors real OpenSCAD's lexer, which warns about hexadecimal constants that
 * do not fit in 64 bits. The literal is clamped to 2^64.
 * @category Warning
 */
export class HexConstantTooLargeLexingWarning extends LexingWarning {
  constructor(pos: CodeLocation, lexeme: string) {
    super(pos, `Hexadecimal constant "${lexeme}" too large. Clamped to 2^64.`);
  }
}

/**
 * Mirrors real OpenSCAD's lexer, which warns when an integer literal rounds to
 * a different value once stored as a double. Numbers in the AST are already
 * doubles, so this is the only place the loss can be reported.
 * @category Warning
 */
export class ImpreciseIntegerLexingWarning extends LexingWarning {
  constructor(pos: CodeLocation, lexeme: string) {
    super(pos, `Integer "${lexeme}" cannot be represented precisely.`);
  }
}
