import CodeSpan from "../CodeSpan";
import Token from "../Token";
import ASTVisitor from "./ASTVisitor";

/**
 * @category AST
 */
export default abstract class ASTNode {
  // A node's tokens are fixed once parsed, and its span is read on every
  // evaluation step, so the combination is done once.
  #span?: WeakRef<CodeSpan>;

  constructor() {}

  abstract tokens: { [key: string]: Token | Token[] | null };

  abstract accept<R>(visitor: ASTVisitor<R>): R;

  get span(): CodeSpan {
    let span = this.#span?.deref();
    if (!span) {
      span = CodeSpan.combine(
        ...Object.values(this.tokens)
          .flat()
          .map((t) => t?.span)
      );
      this.#span = new WeakRef(span);
    }
    return span;
  }
}
