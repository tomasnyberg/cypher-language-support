import { CharStreams, CommonTokenStream } from "antlr4";
import CypherCmdLexer from "../generated-parser/CypherCmdLexer";
import CypherLexer from "../generated-parser/CypherCmdLexer";
import CypherCmdParser, { ClauseContext, EndOfFileContext, MatchClauseContext, ReturnClauseContext } from "../generated-parser/CypherCmdParser";
import CypherCmdParserVisitor from "../generated-parser/CypherCmdParserVisitor";

export class TreePrintVisitor extends CypherCmdParserVisitor<string> {
  buffer: string[] = [];

  visitClause = (ctx: ClauseContext): string => {
    if (this.buffer.length > 0) {
      this.buffer.push('\n')
    }
    this.visitChildren(ctx);
    return ctx.getText();
  }

  visitTerminal = (node: any): string => {
    if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] !== '\n') {
      this.buffer.push(' ');
    }
    if (node.getSymbol().type === CypherCmdLexer.EOF) {
      return node.getText();
    }
    this.buffer.push(node.getText());
    return node.getText();
  }
}


const query = "MATCH (n) WHERE n.name CONTAINS 's' RETURN n.name"

const inputStream = CharStreams.fromString(query);
const lexer = new CypherLexer(inputStream);
const tokens = new CommonTokenStream(lexer);
const parser = new CypherCmdParser(tokens);
parser.buildParseTrees = true
const tree = parser.statementsOrCommands()
const visitor = new TreePrintVisitor();
visitor.visit(tree);
console.log(visitor.buffer.join(''))
