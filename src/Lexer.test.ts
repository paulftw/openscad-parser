import * as exp from "constants";
import { resolve } from "path";
import AssignmentNode from "./ast/AssignmentNode";
import { LiteralExpr, UnaryOpExpr } from "./ast/expressions";
import CodeFile from "./CodeFile";
import ErrorCollector from "./ErrorCollector";
import LexingError from "./errors/LexingError";
import LexingWarning from "./errors/LexingWarning";
import {
  MultiLineComment,
  NewLineExtraToken,
  SingleLineComment,
} from "./extraTokens";
import Lexer from "./Lexer";
import LiteralToken from "./LiteralToken";
import ParsingHelper from "./ParsingHelper";
import Token from "./Token";
import TokenType from "./TokenType";

function lexToTTStream(code: string) {
  const lexer = new Lexer(new CodeFile("<test>", code), new ErrorCollector());
  return lexer.scan().map((token) => token.type);
}

function lexTokens(code: string) {
  const lexer = new Lexer(new CodeFile("<test>", code), new ErrorCollector());
  return lexer.scan();
}

function simplifyTokens(tokens: Token[]) {
  return tokens.map((token) => {
    if (token instanceof LiteralToken) {
      return {
        val: token.value,
        posChar: token.span.start.char,
        type: TokenType[token.type],
        l: token.lexeme,
      };
    }
    return {
      posChar: token.span.start.char,
      type: TokenType[token.type], // reverse lookup the token type so that it is easier to read the snaps
      l: token.lexeme,
    };
  });
}

describe("Lexer", () => {
  it("constructs without crashing", () => {
    new Lexer(new CodeFile("asdf", "b"), new ErrorCollector());
  });
  it("scans simple tokens", () => {
    const tts = lexToTTStream(`%`);
    expect(tts).toEqual([TokenType.Percent, TokenType.Eot]);
  });
  it("scans an empty code file", () => {
    const tts = lexToTTStream(``);
    expect(tts).toEqual([TokenType.Eot]);
  });
  it("ignores whitespace", () => {
    const tts = lexToTTStream(`% {

    }`);
    expect(tts).toEqual([
      TokenType.Percent,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.Eot,
    ]);
  });
  it("ignores NBSP and BOM/ZWNBSP as whitespace", () => {
    const tts = lexToTTStream(`a = 1;b﻿=﻿2;`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.Equal,
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.Identifier,
      TokenType.Equal,
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans braces, parens and brackets", () => {
    const tts = lexToTTStream(`[]{}()`);
    expect(tts).toEqual([
      TokenType.LeftBracket,
      TokenType.RightBracket,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.LeftParen,
      TokenType.RightParen,
      TokenType.Eot,
    ]);
  });
  it("scans braces, parens and brackets", () => {
    const tts = lexToTTStream(`[]{}()`);
    expect(tts).toEqual([
      TokenType.LeftBracket,
      TokenType.RightBracket,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.LeftParen,
      TokenType.RightParen,
      TokenType.Eot,
    ]);
  });
  it("scans identifiers", () => {
    const tts = lexToTTStream(`abc;`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans number literals", () => {
    const tts = lexToTTStream(`5;`);
    expect(tts).toEqual([
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans identifiers starting with a digit", () => {
    const expectNumberSemi = (str: string) => {
      expect(lexToTTStream(str)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    };

    expectNumberSemi("1e3;");
    expectNumberSemi(".3e3;");

    const expectIdentifierSemi = (str: string) =>
      expect(lexToTTStream(str)).toEqual([
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);

    expectIdentifierSemi("0z;");
    expectIdentifierSemi("0ea;");

    expectIdentifierSemi("999e9e9999;");
    expect(lexToTTStream("999e9e9999")).toEqual([
      TokenType.Identifier,
      TokenType.Eot,
    ]);

    expect(lexToTTStream("7_")).toEqual([TokenType.Identifier, TokenType.Eot]);
    expect(lexToTTStream("7_1")).toEqual([TokenType.Identifier, TokenType.Eot]);
    expect(lexToTTStream("0a1")).toEqual([TokenType.Identifier, TokenType.Eot]);

    expect(lexToTTStream("0e.x")).toEqual([
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.Eot,
    ]);

    expect(lexToTTStream("7_segDisplay.x")).toEqual([
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.Eot,
    ]);
  });
  it("scans string literals", () => {
    const tts = lexToTTStream(`"abc";`);
    expect(tts).toEqual([
      TokenType.StringLiteral,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });

  it("scans && and ||", () => {
    const tts = lexToTTStream(`abc && ddd || afs;`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.AND,
      TokenType.Identifier,
      TokenType.OR,
      TokenType.Identifier,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });

  it("scans dots", () => {
    const tts = lexToTTStream(`abc.ddd;`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.Dot,
      TokenType.Identifier,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans hashes", () => {
    const tts = lexToTTStream(`#{}`);
    expect(tts).toEqual([
      TokenType.Hash,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.Eot,
    ]);
  });
  it("scans single line comments", () => {
    const tts = lexToTTStream(`x = 20; // some note +-//asdf`);
    expect(tts).toEqual([
      TokenType.Identifier,
      TokenType.Equal,
      TokenType.NumberLiteral,
      TokenType.Semicolon,
      TokenType.Eot,
    ]);
  });
  it("scans multiline comments", () => {
    const tts = lexToTTStream(`/* ddd \n asdf */`);
    expect(tts).toEqual([TokenType.Eot]);
  });
  it("throws LexingError on unterminated multiline comments", () => {
    expect(() => lexToTTStream(`/* ahdsh`)).toThrowError(LexingError);
  });
  it("throws LexingError on unexpected characters", () => {
    expect(() => lexToTTStream(`@@@@@@`)).toThrowError(LexingError);
  });

  it("adds extraTokens when scanning comments", () => {
    const toks = lexTokens(`/* a comment */asdf//really cool\n\r\n`);
    expect(toks[0].extraTokens).toHaveLength(1);
    expect(toks[0].extraTokens[0]).toBeInstanceOf(MultiLineComment);
    expect((toks[0].extraTokens[0] as MultiLineComment).contents).toEqual(
      " a comment "
    );
    expect(toks[1].extraTokens[0]).toBeInstanceOf(SingleLineComment);
    expect((toks[1].extraTokens[0] as SingleLineComment).contents).toEqual(
      "really cool"
    );
    expect(toks[1].extraTokens[1]).toBeInstanceOf(NewLineExtraToken);
  });
  describe("number lexing", () => {
    function testNumberLexing(source: string) {
      const tokens = lexTokens(source);
      if (!(tokens[0] instanceof LiteralToken)) {
        throw new Error("First token is not a literal. Fix that test!");
      }

      return (tokens[0] as LiteralToken<number>).value;
    }
    it("lexes one digit numbers", () => {
      expect(testNumberLexing("9")).toEqual(9);
    });
    it("lexes zero", () => {
      expect(testNumberLexing("0")).toEqual(0);
      expect(testNumberLexing("0.0")).toEqual(0);
    });
    it("lexes numbers with multiple digits", () => {
      expect(testNumberLexing("786")).toEqual(786);
    });
    it("lexes numbers with decimal point", () => {
      expect(testNumberLexing("333.87")).toEqual(333.87);
    });
    it("lexes exponential numbers", () => {
      expect(testNumberLexing("20e10")).toEqual(20e10);
    });
    it("lexes exponential numbers with negative exponents", () => {
      expect(testNumberLexing("1e-9")).toEqual(1e-9);
    });
    it("lexes exponential numbers with commas", () => {
      expect(testNumberLexing("2.787272e10")).toEqual(2.787272e10);
    });
    it("lexes exponents with a sign", () => {
      expect(testNumberLexing("1.25e+6")).toEqual(1.25e6);
      expect(testNumberLexing("0.25e-2")).toEqual(0.25e-2);
      expect(testNumberLexing("1.E-2")).toEqual(1e-2);
    });

    it("throws LexingError when an invalid number is given", () => {
      expect(() => testNumberLexing("2.2.2")).toThrowError(LexingError);
      expect(() => testNumberLexing("999e99999")).toThrowError(LexingError);
    });
    it("lexes numbers starting with a dot", () => {
      expect(testNumberLexing(".9")).toEqual(0.9);
    });
    it("parses an unfinished decimal even when it may cause problems with lookahead", () => {
      expect(lexToTTStream(`1.`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);
    });
    it("accepts unfinished decimal before rparen", () => {
      expect(lexToTTStream(`linear_extrude(scale=1.)`)).toEqual([
        TokenType.Identifier,
        TokenType.LeftParen,
        TokenType.Identifier,
        TokenType.Equal,
        TokenType.NumberLiteral,
        TokenType.RightParen,
        TokenType.Eot,
      ]);
    });
    it("parses a minus correctly", () => {
      expect(lexToTTStream(`1.e-4`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27-1.0`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Minus,
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27+1.0`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Plus,
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27e+4`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);

      expect(lexToTTStream(`1.27e-4`)).toEqual([
        TokenType.NumberLiteral,
        TokenType.Eot,
      ]);
    });

    it("lexes hexadecimal integer literals", () => {
      expect(testNumberLexing("0x0")).toEqual(0);
      expect(testNumberLexing("0xff")).toEqual(255);
      expect(testNumberLexing("0xFF")).toEqual(255);
      expect(testNumberLexing("0x1A")).toEqual(26);
      expect(testNumberLexing("0x1F600")).toEqual(0x1f600);
      expect(testNumberLexing("0x00000001")).toEqual(1);
    });
    it("only accepts a lowercase 0x prefix - 0X falls back to an identifier", () => {
      expect(lexToTTStream("0X1A;")).toEqual([
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
    it("a hex prefix with no valid hex digit after it falls back to an identifier", () => {
      expect(lexToTTStream("0x;")).toEqual([
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
      expect(lexToTTStream("0x1g;")).toEqual([
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
    it("stops at the first non-hex-digit character, same as the identifier-vs-number race for decimals", () => {
      expect(lexToTTStream("0x1Axyz;")).toEqual([
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
    it("a trailing dot after a hex literal is not a hex float - it starts a new number", () => {
      expect(lexToTTStream("0x1A.5;")).toEqual([
        TokenType.NumberLiteral,
        TokenType.NumberLiteral,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });

    // Numbers are lexed into JS doubles, so by the time an interpreter sees the
    // AST the original digits are gone. These mirror real OpenSCAD's warnings.
    describe("precision warnings (matching real OpenSCAD)", () => {
      function lexWithWarnings(source: string) {
        const errorCollector = new ErrorCollector();
        const tokens = new Lexer(
          new CodeFile("<test>", source),
          errorCollector
        ).scan();
        return { tokens, errorCollector };
      }
      function warningMessages(source: string) {
        return lexWithWarnings(source).errorCollector.warnings.map(
          (w) => w.message
        );
      }

      it("warns when a hexadecimal constant does not fit in 64 bits", () => {
        expect(warningMessages("0x10000000000000000")).toEqual([
          `Hexadecimal constant "0x10000000000000000" too large.`,
        ]);
        expect(warningMessages("0x1ffffffffffffffff")).toEqual([
          `Hexadecimal constant "0x1ffffffffffffffff" too large.`,
        ]);
      });
      it("reports too-large hex as a LexingWarning, without an error", () => {
        const { errorCollector } = lexWithWarnings("0x10000000000000000");
        expect(errorCollector.hasErrors()).toBe(false);
        expect(errorCollector.warnings).toHaveLength(1);
        expect(errorCollector.warnings[0]).toBeInstanceOf(LexingWarning);
      });
      it("judges hex size by value, so leading zeros do not make it too large", () => {
        expect(warningMessages("0x00000000000000000001")).toEqual([]);
        expect(warningMessages("0x0000000000000000fffffffffffff800")).toEqual(
          []
        );
      });

      it("warns when a hexadecimal integer cannot be represented precisely", () => {
        expect(warningMessages("0x1000000000000001")).toEqual([
          `Integer "0x1000000000000001" cannot be represented precisely.`,
        ]);
        expect(warningMessages("0xfffffffffffffff0")).toEqual([
          `Integer "0xfffffffffffffff0" cannot be represented precisely.`,
        ]);
        expect(warningMessages("0x7fffffffffffffff")).toEqual([
          `Integer "0x7fffffffffffffff" cannot be represented precisely.`,
        ]);
        expect(warningMessages("0x20000000000001")).toEqual([
          `Integer "0x20000000000001" cannot be represented precisely.`,
        ]);
      });
      it("warns when a decimal integer cannot be represented precisely", () => {
        expect(warningMessages("1152921504606846977")).toEqual([
          `Integer "1152921504606846977" cannot be represented precisely.`,
        ]);
        expect(warningMessages("18446744073709551600")).toEqual([
          `Integer "18446744073709551600" cannot be represented precisely.`,
        ]);
        expect(warningMessages("9007199254740993")).toEqual([
          `Integer "9007199254740993" cannot be represented precisely.`,
        ]);
        expect(warningMessages("99999999999999999999999")).toEqual([
          `Integer "99999999999999999999999" cannot be represented precisely.`,
        ]);
      });
      it("warns about 0xffffffffffffffff, whose value really does change", () => {
        // 2^64-1 is not a double, it rounds up to 2^64. Real OpenSCAD stays
        // silent here only because of how its uint64 round-trip check saturates.
        expect(warningMessages("0xffffffffffffffff")).toEqual([
          `Integer "0xffffffffffffffff" cannot be represented precisely.`,
        ]);
      });

      it("does not warn about integers that are exactly representable", () => {
        expect(warningMessages("0")).toEqual([]);
        expect(warningMessages("786")).toEqual([]);
        expect(warningMessages("9007199254740991")).toEqual([]); // 2^53 - 1
        expect(warningMessages("9007199254740992")).toEqual([]); // 2^53
        expect(warningMessages("1152921504606846976")).toEqual([]); // 2^60
        expect(warningMessages("18446744073709551616")).toEqual([]); // 2^64
        expect(warningMessages("0x1000000000000000")).toEqual([]);
        expect(warningMessages("0xfffffffffffff800")).toEqual([]); // 53 bits
      });
      it("does not warn about non-integer literals, however large", () => {
        expect(warningMessages("9007199254740993.0")).toEqual([]);
        expect(warningMessages("12345678901234567890.0")).toEqual([]);
        expect(warningMessages("1e30")).toEqual([]);
        expect(warningMessages("123456789012345678e2")).toEqual([]);
      });

      it("still produces the (rounded) number token alongside the warning", () => {
        const { tokens } = lexWithWarnings("1152921504606846977");
        expect(tokens[0]).toBeInstanceOf(LiteralToken);
        expect((tokens[0] as LiteralToken<number>).value).toEqual(
          1152921504606846976
        );
      });
      it("points the warning at the start of the offending literal", () => {
        const { errorCollector } = lexWithWarnings(
          "a = 1;\nb = 1152921504606846977;"
        );
        const loc = errorCollector.warnings[0].codeLocation;
        expect([loc.char, loc.line, loc.col]).toEqual([11, 1, 4]);
      });
      it("reports one warning per offending literal, in source order", () => {
        expect(
          warningMessages("a = [0x1000000000000001, 5, 18446744073709551600];")
        ).toEqual([
          `Integer "0x1000000000000001" cannot be represented precisely.`,
          `Integer "18446744073709551600" cannot be represented precisely.`,
        ]);
      });
      it("clamps a too-large hexadecimal constant to 2^64, like real OpenSCAD", () => {
        const twoTo64 = 18446744073709551616;
        const valueOf = (source: string) =>
          (lexWithWarnings(source).tokens[0] as LiteralToken<number>).value;
        expect(valueOf("0x10000000000000000")).toEqual(twoTo64);
        expect(valueOf("0x1ffffffffffffffff")).toEqual(twoTo64);
        // parseInt alone would give Infinity, which OpenSCAD has no literal for
        expect(valueOf("0x" + "f".repeat(300))).toEqual(twoTo64);
      });

      describe("negation", () => {
        // OpenSCAD has no negative literals: `-0x10` is unary minus applied to 0x10.
        it("lexes a minus before a hex literal as a separate token", () => {
          expect(lexToTTStream("-0x10;")).toEqual([
            TokenType.Minus,
            TokenType.NumberLiteral,
            TokenType.Semicolon,
            TokenType.Eot,
          ]);
          expect(lexToTTStream("x-0x10;")).toEqual([
            TokenType.Identifier,
            TokenType.Minus,
            TokenType.NumberLiteral,
            TokenType.Semicolon,
            TokenType.Eot,
          ]);
        });
        it("does not accept a sign between 0x and the digits - 0x is an identifier", () => {
          expect(lexToTTStream("0x-10;")).toEqual([
            TokenType.Identifier,
            TokenType.Minus,
            TokenType.NumberLiteral,
            TokenType.Semicolon,
            TokenType.Eot,
          ]);
        });
        it("warns about the literal itself, not the minus", () => {
          const { tokens, errorCollector } = lexWithWarnings(
            "a = -0x1000000000000001;"
          );
          expect(errorCollector.warnings.map((w) => w.message)).toEqual([
            `Integer "0x1000000000000001" cannot be represented precisely.`,
          ]);
          expect(errorCollector.warnings[0].codeLocation.col).toEqual(5);
          expect((tokens[3] as LiteralToken<number>).value).toEqual(
            0x1000000000000000
          );
        });
        it("warns about a negated decimal integer by its unsigned literal", () => {
          const { tokens, errorCollector } = lexWithWarnings(
            "x = - 18446744073709551600;"
          );
          expect(errorCollector.warnings.map((w) => w.message)).toEqual([
            `Integer "18446744073709551600" cannot be represented precisely.`,
          ]);
          // "x = - 1..." - the warning points at the digits, past the minus and space
          expect(errorCollector.warnings[0].codeLocation.col).toEqual(6);
          expect(tokens[2].type).toEqual(TokenType.Minus);
          expect((tokens[3] as LiteralToken<number>).value).toEqual(
            18446744073709551616
          );
        });
        it("does not warn about a negated exactly-representable integer", () => {
          expect(
            lexWithWarnings("-9007199254740992").errorCollector.warnings
          ).toHaveLength(0);
          expect(
            lexWithWarnings("-0x1000000000000000").errorCollector.warnings
          ).toHaveLength(0);
        });
        it("clamps a negated 309-digit integer to -Number.MAX_VALUE", () => {
          const { tokens, errorCollector } = lexWithWarnings(
            "-" + "9".repeat(309)
          );
          expect(tokens[0].type).toEqual(TokenType.Minus);
          expect((tokens[1] as LiteralToken<number>).value).toEqual(
            Number.MAX_VALUE
          );
          expect(errorCollector.warnings).toHaveLength(1);
        });
        it("clamps and warns for a negated too-large hex constant", () => {
          const { tokens, errorCollector } = lexWithWarnings(
            "-0x1ffffffffffffffff"
          );
          expect(errorCollector.warnings.map((w) => w.message)).toEqual([
            `Hexadecimal constant "0x1ffffffffffffffff" too large.`,
          ]);
          expect(tokens[0].type).toEqual(TokenType.Minus);
          expect((tokens[1] as LiteralToken<number>).value).toEqual(
            18446744073709551616
          );
        });
      });

      describe("decimal integers beyond the range of a double", () => {
        it("keeps the (finite) value of a 308-digit integer and warns about it", () => {
          const source = "9".repeat(308);
          const { tokens, errorCollector } = lexWithWarnings(source);
          expect((tokens[0] as LiteralToken<number>).value).toEqual(
            Number(source)
          );
          expect(Number.isFinite(Number(source))).toBe(true);
          expect(errorCollector.warnings.map((w) => w.message)).toEqual([
            `Integer "${source}" cannot be represented precisely.`,
          ]);
        });
        // Real OpenSCAD silently turns an integer that overflows a double into
        // 2^64 - off by hundreds of orders of magnitude - and warns only that
        // it is imprecise. There is no Infinity literal, so we saturate at
        // the largest finite double instead, and say so.
        it("clamps an integer that overflows a double to Number.MAX_VALUE", () => {
          for (const source of [
            "9".repeat(309),
            "9".repeat(400),
            "18" + "0".repeat(307), // 1.8e308, just past the largest double
          ]) {
            const { tokens, errorCollector } = lexWithWarnings(source);
            expect((tokens[0] as LiteralToken<number>).value).toEqual(
              Number.MAX_VALUE
            );
            expect(errorCollector.hasErrors()).toBe(false);
            expect(errorCollector.warnings.map((w) => w.message)).toEqual([
              `Integer "${source}" too large.`,
            ]);
            expect(errorCollector.warnings[0]).toBeInstanceOf(LexingWarning);
          }
        });
        it("does not clamp an integer that still rounds to a finite double", () => {
          // 17976931348623158e292 is past Number.MAX_VALUE's digits but rounds down to it
          const source = "17976931348623158" + "0".repeat(292);
          const { tokens, errorCollector } = lexWithWarnings(source);
          expect((tokens[0] as LiteralToken<number>).value).toEqual(
            Number.MAX_VALUE
          );
          expect(errorCollector.warnings.map((w) => w.message)).toEqual([
            `Integer "${source}" cannot be represented precisely.`,
          ]);
        });
        describe("float-form literals that overflow a double", () => {
          const overflowing = [
            "1e309",
            "1e400",
            "1.8e308",
            "1" + "0".repeat(400) + ".0",
          ];
          it("throws a LexingError saying the literal is too large", () => {
            for (const source of overflowing) {
              expect(() => lexTokens(source)).toThrowError(LexingError);
              expect(() => lexTokens(source)).toThrowError(
                `Number literal ${source} is too large to be represented.`
              );
            }
          });
          it("reports exactly one error, not the generic invalid-literal one", () => {
            for (const source of overflowing) {
              const errorCollector = new ErrorCollector();
              expect(() =>
                new Lexer(
                  new CodeFile("<test>", source),
                  errorCollector
                ).scan()
              ).toThrow();
              expect(errorCollector.errors.map((e) => e.message)).toEqual([
                `Number literal ${source} is too large to be represented.`,
              ]);
            }
          });
          it("also rejects a huge exponent on an integer mantissa", () => {
            expect(() => lexTokens("999e99999")).toThrowError(
              "Number literal 999e99999 is too large to be represented."
            );
          });
          it("accepts the largest double and anything that rounds down to it", () => {
            for (const source of [
              "1.7976931348623157e308",
              "1.7976931348623158e308", // rounds down to MAX_VALUE
              "179769313486231570000" + "0".repeat(288) + ".0",
            ]) {
              expect(testNumberLexing(source)).toEqual(Number.MAX_VALUE);
            }
          });
          it("accepts them silently, with no warnings", () => {
            const errorCollector = new ErrorCollector();
            new Lexer(
              new CodeFile("<test>", "1.7976931348623157e308"),
              errorCollector
            ).scan();
            expect(errorCollector.hasErrors()).toBe(false);
            expect(errorCollector.warnings).toEqual([]);
          });
          it("quotes the positive literal when it is negated", () => {
            for (const source of overflowing) {
              expect(() => lexTokens(`-${source}`)).toThrowError(
                `Number literal ${source} is too large to be represented.`
              );
            }
          });
          describe("wherever a literal can appear", () => {
            const contexts: [string, (lit: string) => string][] = [
              ["an assignment", (lit) => `a = ${lit};`],
              ["a negated assignment", (lit) => `a = -${lit};`],
              ["an unused module body", (lit) => `module m() { x = ${lit}; }`],
              ["a function argument", (lit) => `a = f(${lit});`],
              ["an echo argument", (lit) => `echo(${lit});`],
            ];
            for (const [name, wrap] of contexts) {
              it(`rejects the file when it is in ${name}`, () => {
                for (const source of overflowing) {
                  const [ast, errorCollector] = ParsingHelper.parseFile(
                    new CodeFile("<test>", wrap(source))
                  );
                  expect(ast).toBeNull();
                  expect(errorCollector.errors).toHaveLength(1);
                  expect(errorCollector.errors[0]).toBeInstanceOf(LexingError);
                  expect(errorCollector.errors[0].message).toEqual(
                    `Number literal ${source} is too large to be represented.`
                  );
                }
              });
            }
            it("still parses the largest double", () => {
              for (const [, wrap] of contexts) {
                const [ast, errorCollector] = ParsingHelper.parseFile(
                  new CodeFile("<test>", wrap("1.7976931348623157e308"))
                );
                expect(errorCollector.hasErrors()).toBe(false);
                expect(ast).not.toBeNull();
              }
            });
          });
        });
        it("throws a LexingError for a nonzero literal that rounds to zero", () => {
          for (const source of [
            "1e-400",
            "1.5e-999",
            "2e-324",
            "0.0000001e-320",
            "2.4703282292062327e-324",
          ]) {
            expect(() => lexTokens(source)).toThrowError(
              `Number literal ${source} is too close to zero to be represented.`
            );
          }
        });
        it("accepts literals that round to a nonzero subnormal", () => {
          for (const source of [
            "5e-324",
            "3e-324",
            "1e-310",
            "2.4703282292062328e-324",
          ]) {
            expect(testNumberLexing(source)).toEqual(Number(source));
          }
        });
        it("accepts zero literals however negative the exponent", () => {
          for (const source of ["0e-999", "0.0", "0.000e-500", "0e0"]) {
            expect(testNumberLexing(source)).toEqual(0);
          }
        });
        it("never emits a non-finite number literal", () => {
          for (const source of [
            "9".repeat(400),
            "0x" + "f".repeat(300),
            "18" + "0".repeat(307),
          ]) {
            const value = (lexTokens(source)[0] as LiteralToken<number>).value;
            expect(Number.isFinite(value)).toBe(true);
          }
        });
      });

      it("treats inf and nan as ordinary identifiers, not number literals", () => {
        // OpenSCAD has no such constants either; only 1/0 and 0/0 produce them.
        expect(lexToTTStream("inf; nan;")).toEqual([
          TokenType.Identifier,
          TokenType.Semicolon,
          TokenType.Identifier,
          TokenType.Semicolon,
          TokenType.Eot,
        ]);
      });

      it("gives the AST unary minus around the clamped or rounded literal", () => {
        const cases: [string, number][] = [
          ["a = -0x1ffffffffffffffff;", 18446744073709551616],
          ["a = -1152921504606846977;", 1152921504606846976],
        ];
        for (const [source, expected] of cases) {
          const [ast, errorCollector] = ParsingHelper.parseFile(
            new CodeFile("<test>", source)
          );
          expect(errorCollector.hasErrors()).toBe(false);
          expect(errorCollector.warnings).toHaveLength(1);
          const value = (ast!.statements[0] as AssignmentNode).value;
          expect(value).toBeInstanceOf(UnaryOpExpr);
          const unary = value as UnaryOpExpr;
          expect(unary.operation).toEqual(TokenType.Minus);
          expect(unary.right).toBeInstanceOf(LiteralExpr);
          expect(unary.right).toHaveProperty("value", expected);
        }
      });
      it("does not stop ParsingHelper from returning an AST", () => {
        const [ast, errorCollector] = ParsingHelper.parseFile(
          new CodeFile("<test>", "a = 0x10000000000000000;")
        );
        expect(ast).not.toBeNull();
        expect(errorCollector.hasErrors()).toBe(false);
        expect(errorCollector.warnings).toHaveLength(1);
      });
    });
  });

  describe("bitwise and shift operator lexing", () => {
    it("lexes single & and | as their own tokens", () => {
      expect(lexToTTStream(`a & b | c;`)).toEqual([
        TokenType.Identifier,
        TokenType.Ampersand,
        TokenType.Identifier,
        TokenType.Pipe,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
    it("still lexes && and || as AND/OR, not two Ampersand/Pipe tokens", () => {
      expect(lexToTTStream(`a && b || c;`)).toEqual([
        TokenType.Identifier,
        TokenType.AND,
        TokenType.Identifier,
        TokenType.OR,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
    it("lexes ~ as its own token", () => {
      expect(lexToTTStream(`~a;`)).toEqual([
        TokenType.Tilde,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
    it("lexes << and >> as their own tokens, distinct from repeated < or >", () => {
      expect(lexToTTStream(`a << b >> c;`)).toEqual([
        TokenType.Identifier,
        TokenType.ShiftLeft,
        TokenType.Identifier,
        TokenType.ShiftRight,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
    it("disambiguates <</>> from <=/>= and </>", () => {
      expect(lexToTTStream(`a<b;`)).toEqual([
        TokenType.Identifier,
        TokenType.Less,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
      expect(lexToTTStream(`a<=b;`)).toEqual([
        TokenType.Identifier,
        TokenType.LessEqual,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
      expect(lexToTTStream(`a<<b;`)).toEqual([
        TokenType.Identifier,
        TokenType.ShiftLeft,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
      expect(lexToTTStream(`a>b;`)).toEqual([
        TokenType.Identifier,
        TokenType.Greater,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
      expect(lexToTTStream(`a>=b;`)).toEqual([
        TokenType.Identifier,
        TokenType.GreaterEqual,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
      expect(lexToTTStream(`a>>b;`)).toEqual([
        TokenType.Identifier,
        TokenType.ShiftRight,
        TokenType.Identifier,
        TokenType.Semicolon,
        TokenType.Eot,
      ]);
    });
  });

  describe("string lexing", () => {
    function lexOneString(source: string) {
      const errorCollector = new ErrorCollector();
      const lexer = new Lexer(new CodeFile("<test>", source), errorCollector);
      const tokens = lexer.scan();
      if (!(tokens[0] instanceof LiteralToken)) {
        throw new Error("First token is not a literal. Fix that test!");
      }
      return {
        value: (tokens[0] as LiteralToken<string>).value,
        errorCollector,
      };
    }
    function testStringLexing(source: string) {
      return lexOneString(source).value;
    }
    it("lexes simple strings", () => {
      expect(testStringLexing(`"hello"`)).toEqual("hello");
    });
    it("lexes empty strings", () => {
      expect(testStringLexing(`""`)).toEqual("");
    });
    it("lexes strings with escape sequences", () => {
      expect(testStringLexing(`"a\\nb\\t\\rc\\\\gg\\"g"`)).toEqual(
        'a\nb\t\rc\\gg"g'
      );
    });
    it("throws LexingError on unterminated strings", () => {
      expect(() => testStringLexing(`"aaaa`)).toThrowError(LexingError);
    });

    describe("undefined escape sequences (matching real OpenSCAD)", () => {
      it("warns instead of throwing, and drops the backslash", () => {
        const { value, errorCollector } = lexOneString(`"\\XD"`);
        expect(value).toEqual("XD");
        expect(errorCollector.hasErrors()).toBe(false);
        expect(errorCollector.warnings).toHaveLength(1);
        expect(errorCollector.warnings[0]).toBeInstanceOf(LexingWarning);
      });
      it("does not consume anything past the backslash, so a partial escape falls back char-by-char", () => {
        expect(testStringLexing(`"short\\u12end"`)).toEqual("shortu12end");
        expect(testStringLexing(`"hex\\x99end"`)).toEqual("hexx99end");
      });
    });

    describe("line continuation", () => {
      it("swallows a backslash followed by a newline", () => {
        expect(testStringLexing(`"line\\\ncontinued"`)).toEqual(
          "linecontinued"
        );
      });
      it("swallows a backslash followed by a CRLF", () => {
        expect(testStringLexing(`"line\\\r\ncontinued"`)).toEqual(
          "linecontinued"
        );
      });
    });

    describe("\\x hex byte escapes", () => {
      it("decodes two hex digits, the first restricted to 0-7", () => {
        expect(testStringLexing(`"hex\\x41end"`)).toEqual("hexAend");
        expect(testStringLexing(`"hex\\x7Fend"`)).toEqual("hex\x7Fend");
      });
      it("decodes \\x00 to a space, not a NUL byte", () => {
        expect(testStringLexing(`"zero\\x00end"`)).toEqual("zero end");
      });
      it("falls back to a warning when the first digit is out of range", () => {
        const { value, errorCollector } = lexOneString(`"hex\\x99end"`);
        expect(value).toEqual("hexx99end");
        expect(errorCollector.warnings).toHaveLength(1);
      });
    });

    describe("\\u and \\U unicode escapes", () => {
      it("decodes a lowercase \\u with exactly 4 hex digits", () => {
        expect(testStringLexing(`"unicode\\u00A3smthg"`)).toEqual(
          "unicode£smthg"
        );
      });
      it("decodes an uppercase \\U with exactly 6 hex digits", () => {
        expect(testStringLexing(`"big\\U01F600end"`)).toEqual(
          "big\u{1F600}end"
        );
      });
      it("only consumes the first 6 hex digits of \\U, leaving the rest literal", () => {
        expect(testStringLexing(`"big\\U0001F600end"`)).toEqual("bigǶ00end");
      });
      it("decodes codepoint 0 to a space", () => {
        expect(testStringLexing(`"zero\\u0000end"`)).toEqual("zero end");
      });
      it("decodes an invalid surrogate half to a space", () => {
        expect(testStringLexing(`"surr\\uD800end"`)).toEqual("surr end");
      });
      it("decodes a codepoint above U+10FFFF to a space", () => {
        expect(testStringLexing(`"toobig\\U110000end"`)).toEqual("toobig end");
      });
      it("falls back to a warning when there aren't enough hex digits", () => {
        const { value, errorCollector } = lexOneString(`"short\\u12end"`);
        expect(value).toEqual("shortu12end");
        expect(errorCollector.warnings).toHaveLength(1);
      });
    });
  });
  describe("use statement lexing", () => {
    it("does generate a FilenameInChevronsToken", () => {
      const tokens = lexTokens(`use <ddd/astd.scad>`);
      expect(tokens[0].type).toEqual(TokenType.Use);
      expect(tokens[0].lexeme).toEqual("use");
      expect(tokens[1].type).toEqual(TokenType.FilenameInChevrons);
      expect(tokens[1].lexeme).toEqual("<ddd/astd.scad>");
      expect(tokens[1]).toBeInstanceOf(LiteralToken);
      expect((tokens[1] as LiteralToken<string>).value).toEqual(
        "ddd/astd.scad"
      );
    });
    it("does lex an include<...> statement", () => {
      const tokens = lexTokens(`include <ddd/astd.scad>`);
      expect(tokens[0].type).toEqual(TokenType.Include);
      expect(tokens[0].lexeme).toEqual("include");
      expect(tokens[1].type).toEqual(TokenType.FilenameInChevrons);
      expect(tokens[1].lexeme).toEqual("<ddd/astd.scad>");
      expect(tokens[1]).toBeInstanceOf(LiteralToken);
    });
    it("throws when there is no filename after the use keyword", () => {
      expect(() => lexTokens(`use ;`)).toThrowError(LexingError);
    });
    it("throws when there is an unterminated filename", () => {
      expect(() => lexTokens(`use <xD`)).toThrowError(LexingError);
    });
  });
  it("lexes braces with comments properly", () => {
    const tokens = lexTokens(`
{      
{                
 } //end if
}
    `);
    expect(tokens.map((t) => t.type)).toEqual([
      TokenType.LeftBrace,
      TokenType.LeftBrace,
      TokenType.RightBrace,
      TokenType.RightBrace,
      TokenType.Eot,
    ]);
    expect(tokens[3].extraTokens).toHaveLength(2);
    expect(tokens[3].extraTokens[0]).toBeInstanceOf(SingleLineComment);
    expect((tokens[3].extraTokens[0] as SingleLineComment).contents).toEqual(
      `end if`
    );
    expect(tokens[3].extraTokens[1]).toBeInstanceOf(NewLineExtraToken);
  });
  it("does not add duplicate extraTokens", () => {
    const tokens = lexTokens(`
      module indented() {
        asdf = 5;
        // comment
      }
    `);
    expect(tokens.map((t) => t.type)).toEqual([
      /*  0 */ TokenType.Module,
      /*  1 */ TokenType.Identifier,
      /*  2 */ TokenType.LeftParen,
      /*  3 */ TokenType.RightParen,
      /*  4 */ TokenType.LeftBrace,
      /*  5 */ TokenType.Identifier,
      /*  6 */ TokenType.Equal,
      /*  7 */ TokenType.NumberLiteral,
      /*  8 */ TokenType.Semicolon,
      /*  9 */ TokenType.RightBrace,
      /* 10 */ TokenType.Eot,
    ]);
    expect(tokens[9].extraTokens).toHaveLength(3);
    expect(tokens[10].extraTokens).toHaveLength(1);
  });
  it("sets pos and and end of tokens so that there is no gaps between them", () => {
    const tokens = lexTokens(`{     }{}`); // 5 spaces
    expect(tokens[0].span.end.char).toEqual(tokens[1].startWithWhitespace.char);
  });
  it("generates start and and in spans", () => {
    const tokens = lexTokens(`b();`); // 5 spaces
    expect(tokens.length).not.toBe(0);
    tokens.every((t) => {
      expect(t.span.start).toBeTruthy();
      expect(t.span.end).toBeTruthy();
    });
  });
  describe.skip("lexing of random files found on the internet", () => {
    async function lexFile(path: string) {
      const file = await CodeFile.load(resolve(__dirname, path));
      const lexer = new Lexer(file, new ErrorCollector());
      return lexer.scan();
    }
    it("lexes hull.scad and matches snapshot", async () => {
      const tokens = await lexFile("testdata/hull.scad");
      expect(simplifyTokens(tokens)).toMatchSnapshot();
    });
  });
});
