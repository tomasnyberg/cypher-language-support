import { CharStreams, CommonTokenStream } from "antlr4";
import CypherLexer from "../generated-parser/CypherCmdLexer";
import CypherCmdParser, { ClauseContext, MatchClauseContext, ReturnClauseContext } from "../generated-parser/CypherCmdParser";
import CypherCmdParserVisitor from "../generated-parser/CypherCmdParserVisitor";

export class TreePrintVisitor extends CypherCmdParserVisitor<string> {
  output = "";

  visitMatchClause = (ctx: MatchClauseContext): string => {
    this.output += ctx.MATCH() + ' ' + ctx.patternList().getText();
    return ctx.getText();
  }

  visitReturnClause = (ctx: ReturnClauseContext): string => {
    this.output += '\n' + ctx.RETURN().getText() + ' ' + ctx.returnBody().getText();
    return ctx.getText();
  }
}


const query = "MATCH (n) RETURN n"

const inputStream = CharStreams.fromString(query);
const lexer = new CypherLexer(inputStream);
const tokens = new CommonTokenStream(lexer);
const parser = new CypherCmdParser(tokens);
parser.buildParseTrees = true
const tree = parser.statementsOrCommands()
const visitor = new TreePrintVisitor();
const result = visitor.visit(tree);
console.log(visitor.output);
//console.log(result[0][0][0][0][0])
