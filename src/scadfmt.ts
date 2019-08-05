import CodeFile from "./CodeFile";
import Lexer from "./Lexer";
import Parser from "./Parser";
import { runInContext } from "vm";
import SimpleASTPrinter from "./SimpleASTPrinter";
import ErrorCollector from "./ErrorCollector";
import Token from "./Token";

async function run() {
  const filename = process.argv[2];
  const file = await CodeFile.load(filename);
  const errorCollector = new ErrorCollector();
  const lexer = new Lexer(file, errorCollector);
  let tokens: Token[];
  try {
    tokens = lexer.scan();
  } catch (e) {}
  if (errorCollector.hasErrors()) {
    errorCollector.printErrors();
    process.exit(999);
  }
  const parser = new Parser(file, tokens, errorCollector);
  console.log(new SimpleASTPrinter().visitScadFile(parser.parse()));
}
run().catch(console.error);