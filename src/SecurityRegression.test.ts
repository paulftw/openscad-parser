import * as path from "path";
import { ParamAnnotation } from "./comments/annotations";
import { ModuleDeclarationStmt } from "./ast/statements";
import ScadFile from "./ast/ScadFile";
import ASTPrinter from "./ASTPrinter";
import CodeFile from "./CodeFile";
import ErrorCollector from "./ErrorCollector";
import FormattingConfiguration from "./FormattingConfiguration";
import Lexer from "./Lexer";
import ParsingHelper from "./ParsingHelper";
import PreludeUtil from "./prelude/PreludeUtil";
import ASTScopePopulator from "./semantic/ASTScopePopulator";
import Scope from "./semantic/Scope";
import SymbolResolver from "./semantic/SymbolResolver";
import TokenType from "./TokenType";

const inheritedObjectNames = [
  "constructor",
  "__proto__",
  "prototype",
  "toString",
  "toLocaleString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
];

describe("untrusted OpenSCAD identifiers", () => {
  it("keeps Object.prototype names as identifiers through lexing, parsing, and symbol resolution", async () => {
    const file = await CodeFile.load(
      path.resolve(__dirname, "testdata/javascript-identifier-attacks.scad")
    );
    const [ast, errors] = ParsingHelper.parseFile(file);

    expect(errors.errors).toEqual([]);
    expect(ast).not.toBeNull();

    const identifierTokens = new Lexer(file, new ErrorCollector())
      .scan()
      .filter((token) => inheritedObjectNames.includes(token.lexeme));
    expect(identifierTokens).toHaveLength(inheritedObjectNames.length * 5);
    expect(
      identifierTokens.every((token) => token.type === TokenType.Identifier)
    ).toBe(true);

    const scope = new Scope();
    scope.siblingScopes = [PreludeUtil.preludeScope];
    const populated = ast!.accept(new ASTScopePopulator(scope)) as ScadFile;
    for (const name of inheritedObjectNames) {
      expect(scope.lookupVariable(name)?.name).toBe(name);
    }
    for (const name of inheritedObjectNames) {
      expect(scope.lookupFunction(name)?.name).toBe(name);
      expect(scope.lookupModule(name)?.name).toBe(name);
    }

    populated.accept(new SymbolResolver(errors));
    expect(errors.errors).toEqual([]);
    expect(
      new ASTPrinter(new FormattingConfiguration()).visitScadFile(populated)
    ).toContain("echo(constructor, __proto__, prototype");

    const documented = populated.statements.find(
      (statement): statement is ModuleDeclarationStmt =>
        statement instanceof ModuleDeclarationStmt &&
        statement.name === "documented"
    );
    const param = documented!.docComment.annotations.find(
      (annotation): annotation is ParamAnnotation =>
        annotation instanceof ParamAnnotation
    );
    expect(Object.getPrototypeOf(param!.tags)).toBeNull();
    for (const name of inheritedObjectNames) {
      expect(Object.hasOwn(param!.tags, name)).toBe(true);
    }
  });

  it.each(["\u0430", "\u03b1", "\uff3f"])(
    "rejects unsupported Unicode identifier character %s",
    (character) => {
      const [ast, errors] = ParsingHelper.parseFile(
        new CodeFile("<test>", `echo(${character}constructor);`)
      );

      expect(ast).toBeNull();
      expect(errors.hasErrors()).toBe(true);
    }
  );
});
