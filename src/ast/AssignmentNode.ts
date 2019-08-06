import ASTNode from "./ASTNode";
import { Expression } from "./expressions";
import CodeLocation from "../CodeLocation";
import ASTVisitor from "./ASTVisitor";
import Token from "../Token";


/**
 * Represents a value being assigned to a name. Used when declaring and calling modules or functions. 
 * It is also used in control flow structures such as for loops and let expressions.
 * @category AST
 */
export default class AssignmentNode extends ASTNode {
  /**
   * The name of the value being assigned.
   * The name field may be empty when it represents a positional argument in a call.
   */
  name: string;
  /**
   * THe value of the name being assigned.
   */
  value: Expression;
  constructor(
    pos: CodeLocation,
    name: string,
    value: Expression,
    public tokens: {
      name: Token;
      equals: Token;
      trailingCommas: Token[];
      semicolon: Token
    }
  ) {
    super(pos);
    this.name = name;
    this.value = value;
  }
  accept<R>(visitor: ASTVisitor<R>): R {
    return visitor.visitAssignmentNode(this);
  }
}
