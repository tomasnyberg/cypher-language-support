import { CharStreams, CommonTokenStream } from "antlr4";
import CypherCmdLexer from "../generated-parser/CypherCmdLexer";
import CypherLexer from "../generated-parser/CypherCmdLexer";
import CypherCmdParser, { ClauseContext, EndOfFileContext, MatchClauseContext, MergeActionContext, NodePatternContext, ReturnClauseContext, VariableContext } from "../generated-parser/CypherCmdParser";
import CypherCmdParserVisitor from "../generated-parser/CypherCmdParserVisitor";
import { lexerKeywords } from "../lexerSymbols";

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
    if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] !== '\n'
      && this.buffer[this.buffer.length - 1] !== ' ') {
      if (lexerKeywords.includes(node.symbol.type)) {
        this.buffer.push(' ');
      }
    }
    if (node.getSymbol().type === CypherCmdLexer.EOF) {
      return node.getText();
    }
    if (lexerKeywords.includes(node.symbol.type)) {
      this.buffer.push(node.getText().toUpperCase());
    } else {
      this.buffer.push(node.getText());
    }
    if (lexerKeywords.includes(node.symbol.type)) {
      this.buffer.push(' ');
    }
    return node.getText();
  }

  visitMergeAction = (ctx: MergeActionContext): string => {
    if (this.buffer.length > 0) {
      this.buffer.push('\n')
      this.buffer.push('  ')
    }
    this.visitChildren(ctx);
    return ctx.getText();
  }
}


const query = `MERGE (n) ON CREATE SET n.prop = 0
merge (a:A)-[:T]->(b:B)
ON MATCH SET b.name = 'you'
ON CREATE SET a.name = 'me'
RETURN a.prop`;

const inputStream = CharStreams.fromString(query);
const lexer = new CypherLexer(inputStream);
const tokens = new CommonTokenStream(lexer);
const parser = new CypherCmdParser(tokens);
parser.buildParseTrees = true
const tree = parser.statementsOrCommands()
const visitor = new TreePrintVisitor();
visitor.visit(tree);
console.log(visitor.buffer.join(''))
