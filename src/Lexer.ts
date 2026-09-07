import CodeFile from "./CodeFile";
import CodeLocation from "./CodeLocation";
import CodeSpan from "./CodeSpan";
import ErrorCollector from "./ErrorCollector";
import {
  InvalidNumberLiteralLexingError,
  TooManyDotsInNumberLiteralLexingError,
  TooManyEInNumberLiteralLexingError,
  UnexpectedCharacterLexingError,
  UnterminatedFilenameLexingError,
  UnterminatedMultilineCommentLexingError,
  UnterminatedStringLiteralLexingError,
} from "./errors/lexingErrors";
import { UndefinedEscapeSequenceLexingWarning } from "./errors/lexingWarnings";
import {
  ExtraToken,
  MultiLineComment,
  NewLineExtraToken,
  SingleLineComment,
} from "./extraTokens";
import keywords from "./keywords";
import LiteralToken from "./LiteralToken";
import Token from "./Token";
import TokenType from "./TokenType";

/**
 * The lexer is responsible for turning a string of characters into a stream of
 * tokens. The tokens are then used by the parser to build an abstract syntax
 * tree.
 *
 * The lexer handles parsing of string literals, digraphs (e.g. `<=`), and numbers.
 * It also handles detecting keywords and identifiers.
 */
export default class Lexer {
  protected start!: CodeLocation;
  protected startWithWhitespace!: CodeLocation;
  public tokens: Token[] = [];
  protected currentExtraTokens: ExtraToken[] = [];

  protected charOffset = 0;
  protected lineOffset = 0;
  protected colOffset = 0;
  protected _currLocCache: CodeLocation | null = null;

  constructor(
    public codeFile: CodeFile,
    public errorCollector: ErrorCollector
  ) {}
  /**
   * Scans the whole CodeFile and splits it into tokens.
   * @throws LexingError
   */
  scan(): Token[] {
    this.start = this.getLoc();
    this.startWithWhitespace = this.getLoc();
    while (!this.isAtEnd()) {
      this.start = this.getLoc();
      this.scanToken();
    }
    this.start = this.getLoc();
    this.addToken(TokenType.Eot);
    return this.tokens;
  }

  protected scanToken() {
    const c = this.advance();
    switch (c) {
      case "(":
        this.addToken(TokenType.LeftParen);
        break;
      case ")":
        this.addToken(TokenType.RightParen);
        break;
      case "{":
        this.addToken(TokenType.LeftBrace);
        break;
      case "}":
        this.addToken(TokenType.RightBrace);
        break;
      case "[":
        this.addToken(TokenType.LeftBracket);
        break;
      case "]":
        this.addToken(TokenType.RightBracket);
        break;
      case "+":
        this.addToken(TokenType.Plus);
        break;
      case "-":
        this.addToken(TokenType.Minus);
        break;
      case "%":
        this.addToken(TokenType.Percent);
        break;
      case "*":
        this.addToken(TokenType.Star);
        break;
      case "^":
        this.addToken(TokenType.Caret);
        break;
      case "/":
        if (this.match("/")) {
          const comment = new SingleLineComment(this.getLoc(), "");
          // consume a comment
          while (this.peek() != "\n" && !this.isAtEnd()) {
            comment.contents += this.advance();
          }
          this.currentExtraTokens.push(comment);
        } else if (this.match("*")) {
          const comment = new MultiLineComment(this.getLoc(), "");

          // multiline comment
          while (
            !(this.peek() == "*" && this.peekNext() == "/") &&
            !this.isAtEnd()
          ) {
            comment.contents += this.advance();
          }
          if (this.isAtEnd()) {
            throw this.errorCollector.reportError(
              new UnterminatedMultilineCommentLexingError(this.getLoc())
            );
          }
          this.currentExtraTokens.push(comment);
          this.advance(); // advance the star
          this.advance(); // advance the slash
        } else {
          this.addToken(TokenType.Slash);
        }
        break;
      case ".":
        // allow lexing of numbers without the leading 0
        if (/[0-9]/.test(this.peek())) {
          this.consumeNumberLiteral();
          break;
        }
        this.addToken(TokenType.Dot);
        break;
      case ",":
        this.addToken(TokenType.Comma);
        break;
      case ":":
        this.addToken(TokenType.Colon);
        break;
      case "?":
        this.addToken(TokenType.QuestionMark);
        break;
      case ";":
        this.addToken(TokenType.Semicolon);
        break;
      case "#":
        this.addToken(TokenType.Hash);
        break;
      case "!":
        if (this.match("=")) {
          this.addToken(TokenType.BangEqual);
        } else {
          this.addToken(TokenType.Bang);
        }
        break;
      case "<":
        if (this.match("<")) {
          this.addToken(TokenType.ShiftLeft);
        } else if (this.match("=")) {
          this.addToken(TokenType.LessEqual);
        } else {
          this.addToken(TokenType.Less);
        }
        break;
      case ">":
        if (this.match(">")) {
          this.addToken(TokenType.ShiftRight);
        } else if (this.match("=")) {
          this.addToken(TokenType.GreaterEqual);
        } else {
          this.addToken(TokenType.Greater);
        }
        break;
      case "=":
        if (this.match("=")) {
          this.addToken(TokenType.EqualEqual);
        } else {
          this.addToken(TokenType.Equal);
        }
        break;
      case "&":
        if (this.match("&")) {
          this.addToken(TokenType.AND);
        } else {
          this.addToken(TokenType.Ampersand);
        }
        break;
      case "|":
        if (this.match("|")) {
          this.addToken(TokenType.OR);
        } else {
          this.addToken(TokenType.Pipe);
        }
        break;
      case "~":
        this.addToken(TokenType.Tilde);
        break;
      case "\n":
        this.currentExtraTokens.push(new NewLineExtraToken(this.getLoc()));
        break;
      case "\r":
      case " ":
      case "\t":
        break; // ignore whitespace
      case '"':
        this.consumeStringLiteral();
        break;
      default:
        if (/[0-9]/.test(c)) {
          this.consumeNumberOrIdentifierOrKeyword();
        } else if (/[A-Za-z\$_]/.test(c)) {
          this.consumeIdentifierOrKeyword();
        } else {
          throw this.errorCollector.reportError(
            new UnexpectedCharacterLexingError(this.getLoc(), c)
          );
        }
    }
  }
  protected consumeStringLiteral() {
    let str = "";
    while (this.peek() != '"' && !this.isAtEnd()) {
      const c = this.advance();
      // handle escape sequences
      if (c == "\\") {
        if (this.match('"')) {
          str += '"';
        } else if (this.match("\\")) {
          str += "\\";
        } else if (this.match("n")) {
          str += "\n";
        } else if (this.match("t")) {
          str += "\t";
        } else if (this.match("r")) {
          str += "\r";
        } else if (this.match("\n")) {
          // line continuation: a backslash followed by a real newline is
          // swallowed entirely, joining the two physical lines.
        } else if (this.peek() == "\r" && this.peekNext() == "\n") {
          this.advance();
          this.advance();
        } else if (
          this.peek() == "x" &&
          this.isOctalDigit(this.peekAt(1)) &&
          this.isHexDigit(this.peekAt(2))
        ) {
          this.advance(); // x
          const hex = this.advance() + this.advance();
          str += this.decodeByteEscape(parseInt(hex, 16));
        } else if (this.peek() == "u" && this.hasHexDigitsAt(1, 4)) {
          this.advance(); // u
          str += this.decodeUnicodeEscape(this.advanceHexDigits(4));
        } else if (this.peek() == "U" && this.hasHexDigitsAt(1, 6)) {
          this.advance(); // U
          str += this.decodeUnicodeEscape(this.advanceHexDigits(6));
        } else {
          this.errorCollector.reportWarning(
            new UndefinedEscapeSequenceLexingWarning(this.getLoc(), this.peek())
          );
          // the backslash is simply dropped; whatever follows it (which may
          // itself look like the start of another escape) is scanned as a
          // plain character on the next iteration of this loop.
        }
      } else {
        str += c;
      }
    }
    if (this.isAtEnd()) {
      throw this.errorCollector.reportError(
        new UnterminatedStringLiteralLexingError(this.getLoc())
      );
    }
    this.advance();
    this.addToken(TokenType.StringLiteral, str);
  }
  protected isHexDigit(c: string) {
    return /[0-9a-fA-F]/.test(c);
  }
  protected isOctalDigit(c: string) {
    return /[0-7]/.test(c);
  }
  /** Checks that the `count` characters starting `offset` chars ahead of the current position are all hex digits. */
  protected hasHexDigitsAt(offset: number, count: number) {
    for (let i = 0; i < count; i++) {
      if (!this.isHexDigit(this.peekAt(offset + i))) return false;
    }
    return true;
  }
  /** Advances past and returns the next `count` characters, assumed to already be verified as hex digits. */
  protected advanceHexDigits(count: number) {
    let hex = "";
    for (let i = 0; i < count; i++) {
      hex += this.advance();
    }
    return hex;
  }
  /** A NUL byte can't be embedded in the string, so - like real OpenSCAD - it is replaced with a space. */
  protected decodeByteEscape(byte: number) {
    return byte === 0 ? " " : String.fromCharCode(byte);
  }
  /** Matches real OpenSCAD: codepoint 0, surrogate halves, and anything past U+10FFFF decode to a single space. */
  protected decodeUnicodeEscape(hex: string) {
    const codepoint = parseInt(hex, 16);
    const isSurrogate = codepoint >= 0xd800 && codepoint <= 0xdfff;
    if (codepoint === 0 || codepoint > 0x10ffff || isSurrogate) {
      return " ";
    }
    return String.fromCodePoint(codepoint);
  }
  protected consumeNumberLiteral() {
    let ateDigit = /[0-9]/.test(this.codeFile.code[this.start.char]);
    let ateDot = "." === this.codeFile.code[this.start.char];
    let justAteExp = false;

    while (
      /[0-9]/.test(this.peek()) ||
      (this.peek() == "." && /[0-9]/.test(this.peekNext())) ||
      ((this.peek() == "e" || this.peek() == "E") &&
        /[0-9\-+]/.test(this.peekNext())) ||
      (this.peek() == "-" && /[0-9]/.test(this.peekNext()) && justAteExp) ||
      (this.peek() == "+" && /[0-9]/.test(this.peekNext()) && justAteExp) ||
      (this.peek() == "." && ateDigit && !ateDot)
    ) {
      ateDigit = ateDigit || /[0-9]/.test(this.peek());
      ateDot = ateDot || this.peek() == ".";
      justAteExp = this.peek() == "e" || this.peek() == "E";
      this.advance();
    }
    const lexeme = this.codeFile.code.substring(
      this.start.char,
      this.charOffset
    );
    if ((lexeme.match(/\./g) || []).length > 1) {
      throw this.errorCollector.reportError(
        new TooManyDotsInNumberLiteralLexingError(this.getLoc(), lexeme)
      );
    }
    if ((lexeme.match(/e/g) || []).length > 1) {
      throw this.errorCollector.reportError(
        new TooManyEInNumberLiteralLexingError(this.getLoc(), lexeme)
      );
    }
    const value = parseFloat(lexeme);
    if (isNaN(value) || !isFinite(value)) {
      throw this.errorCollector.reportError(
        new InvalidNumberLiteralLexingError(this.getLoc(), lexeme)
      );
    }
    this.addToken(TokenType.NumberLiteral, value);
  }
  protected consumeHexNumberLiteral() {
    this.advance(); // 0
    this.advance(); // x
    while (/[0-9a-fA-F]/.test(this.peek())) {
      this.advance();
    }
    const lexeme = this.codeFile.code.substring(
      this.start.char,
      this.charOffset
    );
    this.addToken(TokenType.NumberLiteral, parseInt(lexeme.slice(2), 16));
  }
  protected consumeIdentifierOrKeyword() {
    while (/[A-Za-z0-9_\$]/.test(this.peek()) && !this.isAtEnd()) {
      this.advance();
    }
    const lexeme = this.codeFile.code.substring(
      this.start.char,
      this.charOffset
    );
    if (lexeme in keywords) {
      const keywordType = keywords[lexeme];
      this.addToken(keywordType);
      // check if we need to lex a filename
      if (keywordType === TokenType.Use || keywordType === TokenType.Include) {
        this.consumeFileNameInChevrons();
      }
      return;
    }
    this.addToken(TokenType.Identifier, lexeme);
  }

  protected consumeNumberOrIdentifierOrKeyword() {
    // OpenSCAD does accept identifiers starting with a digit.
    // `9e9e9=1;echo(9e9e9);` is a valid code, `9e9=1;` produces a syntax error.
    // Docs don't specify how conflicts are resolved, but from experiments
    // it seems like a number is chosen unless an identifier is a longer match.
    // That would be consistent with how lex/flex generated lexers work.

    let wordLength = 1;
    while (
      this.start.char + wordLength < this.codeFile.code.length &&
      /[0-9a-zA-Z_\$]/.test(this.codeFile.code[this.start.char + wordLength])
    ) {
      wordLength++;
    }

    // Only lowercase "0x" is a hex prefix - "0X1A", "0x1g", "0x" fall
    // through to being lexed as an identifier.
    const hexMatch = this.peekRegex(/^0x[0-9a-fA-F]+/);
    if (hexMatch.length >= wordLength) {
      return this.consumeHexNumberLiteral();
    }

    const possibleNumberStarts = [
      this.peekRegex(/^[0-9]+/),
      this.peekRegex(/^[0-9]+[.]/),
      this.peekRegex(/^[0-9]+[eE][+-]?[0-9]+/),
    ];
    const numberLength = Math.max(...possibleNumberStarts.map((x) => x.length));

    // If number is longer or same length as an indentifier - number wins.
    if (numberLength >= wordLength) {
      return this.consumeNumberLiteral();
    } else {
      return this.consumeIdentifierOrKeyword();
    }
  }

  protected consumeFileNameInChevrons() {
    this.startWithWhitespace = this.getLoc();
    while (!this.isAtEnd()) {
      this.start = this.getLoc();
      if (
        this.match("\n") ||
        this.match("\t") ||
        this.match("\r") ||
        this.match(" ")
      )
        continue; // ignore whitespace

      if (this.match("<")) break;
      // The openscad parser does not allow putting comments like this: `use /* ddd*/ <file.scad>`
      // We must check that and report an error
      throw this.errorCollector.reportError(
        new UnexpectedCharacterLexingError(this.getLoc(), this.advance())
      );
    }
    if (this.isAtEnd()) {
      throw this.errorCollector.reportError(
        new UnterminatedFilenameLexingError(this.getLoc())
      );
    }
    let filename = "";
    let didEnd = false;
    while (!this.isAtEnd()) {
      const c = this.advance();
      if (c === ">") {
        didEnd = true;
        break;
      }
      filename += c;
    }
    if (!didEnd) {
      throw this.errorCollector.reportError(
        new UnterminatedFilenameLexingError(this.getLoc())
      );
    }
    this.addToken(TokenType.FilenameInChevrons, filename);
  }

  /**
   * Adds a token to the token list. If a value is provieded a LiteralToken is pushed.
   *
   * Additionally it handles clearing and attaching the extra tokens.
   */
  protected addToken<TValue = any>(
    tokenType: TokenType,
    value: TValue | null = null
  ) {
    const lexeme = this.codeFile.code.substring(
      this.start.char,
      this.charOffset
    );
    let token;
    if (value != null) {
      token = new LiteralToken(
        tokenType,
        new CodeSpan(this.start, this.getLoc()),
        lexeme,
        value
      );
    } else {
      token = new Token(
        tokenType,
        new CodeSpan(this.start, this.getLoc()),
        lexeme
      );
    }
    token.extraTokens = this.currentExtraTokens;
    token.startWithWhitespace = this.startWithWhitespace;
    this.startWithWhitespace = this.getLoc();
    this.currentExtraTokens = [];
    this.tokens.push(token);
  }
  protected isAtEnd() {
    return this.charOffset >= this.codeFile.code.length;
  }
  protected match(expected: string) {
    if (this.isAtEnd()) return false;
    if (this.codeFile.code[this.charOffset] !== expected) return false;
    this.advance();
    return true;
  }
  protected advance() {
    const c = this.codeFile.code[this.charOffset];
    this.charOffset++;
    if (c === "\n") {
      this.lineOffset++;
      this.colOffset = 0;
    } else {
      this.colOffset++;
    }
    this._currLocCache = null;
    return c;
  }

  protected getLoc() {
    if (!this._currLocCache) {
      this._currLocCache = new CodeLocation(
        this.codeFile,
        this.charOffset,
        this.lineOffset,
        this.colOffset
      );
    }
    return this._currLocCache;
  }

  protected peek() {
    if (this.isAtEnd()) return "\0";
    return this.codeFile.code[this.charOffset];
  }
  protected peekNext() {
    if (this.charOffset + 1 >= this.codeFile.code.length) return "\0";
    return this.codeFile.code[this.charOffset + 1];
  }
  protected peekAt(offset: number) {
    if (this.charOffset + offset >= this.codeFile.code.length) return "\0";
    return this.codeFile.code[this.charOffset + offset];
  }

  protected peekRegex(regex: RegExp) {
    const text = this.codeFile.code.slice(this.start.char);
    const match = regex.exec(text);
    return !match || match.index !== 0 ? "" : match[0];
  }
}
