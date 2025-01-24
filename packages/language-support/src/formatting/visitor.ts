import { CharStreams, CommonTokenStream } from "antlr4";
import CypherCmdLexer from "../generated-parser/CypherCmdLexer";
import CypherLexer from "../generated-parser/CypherCmdLexer";
import CypherCmdParser, { ClauseContext, EndOfFileContext, MatchClauseContext, MergeActionContext, NodePatternContext, PropertyContext, ReturnClauseContext, ReturnItemsContext, VariableContext, WhereClauseContext } from "../generated-parser/CypherCmdParser";
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

  visitVariable = (ctx: VariableContext): string => {
    this.buffer.push(ctx.getText());
    return ctx.getText();
  }

  visitReturnItems = (ctx: ReturnItemsContext): string => {
    ctx.returnItem_list().forEach((item, idx) => {
      this.visit(item);
      if (idx < ctx.returnItem_list().length - 1) {
        this.buffer.push(', ');
      }
    });
    return ctx.getText();
  }

  visitProperty = (ctx: PropertyContext): string => {
    this.buffer.push('.');
    this.buffer.push(ctx.propertyKeyName().getText());
    return ctx.getText();
  }

  visitWhereClause = (ctx: WhereClauseContext): string => {
    if (this.buffer.length > 0) {
      this.buffer.push('\n');
    }
    return this.visitChildren(ctx);
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


const query1 = `MERGE (n) ON CREATE SET n.prop = 0 merge (a:A)-[:T]->(b:B) ON MATCH SET b.name = 'you' ON CREATE SET a.name = 'me' RETURN a.prop`;
const query2 = `CREATE (n:Label {prop: 0}) WITH n, rand() AS rand RETURN rand, map.propertyKey, count(n)`
const query3 = `MATCH (a:A) WHERE EXISTS {MATCH (a)-->(b:B) WHERE b.prop = 'yellow'} RETURN a.foo`;
const query4 = `MATCH (n) WHERE n.name CONTAINS 's' RETURN n.name`;
const query5 = `MATCH (n)--(m)--(k)--(l) RETURN n, m, k, l`;

function formatQuery(query: string) {
  const inputStream = CharStreams.fromString(query);
  const lexer = new CypherLexer(inputStream);
  const tokens = new CommonTokenStream(lexer);
  const parser = new CypherCmdParser(tokens);
  parser.buildParseTrees = true
  const tree = parser.statementsOrCommands()
  const visitor = new TreePrintVisitor();
  visitor.visit(tree);
  console.log(visitor.buffer.join(''))
  console.log();
}

formatQuery(query1)
formatQuery(query2)
formatQuery(query3)
formatQuery(query4)
formatQuery(query5)
