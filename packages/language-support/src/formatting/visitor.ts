import { CharStreams, CommonTokenStream, TerminalNode } from "antlr4";
import CypherCmdLexer from "../generated-parser/CypherCmdLexer";
import CypherLexer from "../generated-parser/CypherCmdLexer";
import CypherCmdParser, { ArrowLineContext, ClauseContext, ExistsExpressionContext, LabelExpressionContext, LeftArrowContext, MapContext, MergeActionContext, MergeClauseContext, PropertyContext, ReturnItemsContext, RightArrowContext, UnescapedSymbolicNameStringContext, WhereClauseContext } from "../generated-parser/CypherCmdParser";
import CypherCmdParserVisitor from "../generated-parser/CypherCmdParserVisitor";
import { lexerKeywords, lexerOperators } from "../lexerSymbols";

function wantsSpaces(tokenType: number): boolean {
  return lexerKeywords.includes(tokenType) ||
    lexerOperators.includes(tokenType);
}

export class TreePrintVisitor extends CypherCmdParserVisitor<string> {
  buffer: string[] = [];
  indentation = 0

  // Handled separately because clauses shuold have newlines
  visitClause = (ctx: ClauseContext): string => {
    if (this.buffer.length > 0) {
      this.buffer.push('\n')
    }
    this.visitChildren(ctx);
    return ctx.getText();
  }

  visitArrowLine = (ctx: ArrowLineContext): string => {
    this.buffer.push('-');
    return ctx.getText();
  }

  visitRightArrow = (ctx: RightArrowContext): string => {
    this.buffer.push('>');
    return ctx.getText();
  }

  visitLeftArrow = (ctx: LeftArrowContext): string => {
    this.buffer.push('<');
    return ctx.getText();
  }

  visitLabelExpression = (ctx: LabelExpressionContext): string => {
    if (ctx.COLON()) {
      this.buffer.push(':');
    }
    if (ctx.IS()) {
      this.buffer.push('IS');
    }
    this.visit(ctx.labelExpression4());
    return ctx.getText();
  }

  visitTerminal = (node: TerminalNode): string => {
    if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] === '\n') {
      for (let i = 0; i < this.indentation; i++) {
        this.buffer.push(" ")
        this.buffer.push(" ")
      }
    }

    if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] !== '\n'
      && this.buffer[this.buffer.length - 1] !== ' ') {
      if (wantsSpaces(node.symbol.type)) {
        this.buffer.push(' ');
      }
    }
    if (node.symbol.type === CypherCmdLexer.EOF) {
      return node.getText();
    }
    if (lexerKeywords.includes(node.symbol.type)) {
      this.buffer.push(node.getText().toUpperCase());
    } else {
      this.buffer.push(node.getText());
    }
    if (wantsSpaces(node.symbol.type)) {
      this.buffer.push(' ');
    }
    return node.getText();
  }

  visitUnescapedSymbolicNameString = (ctx: UnescapedSymbolicNameStringContext): string => {
    this.buffer.push(ctx.getText());
    return ctx.getText();
  }

  // Handled separately because we want spaces between the commas
  visitReturnItems = (ctx: ReturnItemsContext): string => {
    ctx.returnItem_list().forEach((item, idx) => {
      this.visit(item);
      if (idx < ctx.returnItem_list().length - 1) {
        this.buffer.push(',');
        this.buffer.push(' ');
      }
    });
    return ctx.getText();
  }

  // Handled separately because property names can be keywords
  visitProperty = (ctx: PropertyContext): string => {
    this.buffer.push('.');
    this.buffer.push(ctx.propertyKeyName().getText());
    return ctx.getText();
  }

  // Handled separately because where is not a clause (it is a subclause)
  visitWhereClause = (ctx: WhereClauseContext): string => {
    if (this.buffer.length > 0) {
      this.buffer.push('\n');
    }
    return this.visitChildren(ctx);
  }

  visitExistsExpression = (ctx: ExistsExpressionContext): string => {
    this.buffer.push("EXISTS")
    this.buffer.push(" {")
    if (ctx.regularQuery()) {
      this.indentation++;
      this.visit(ctx.regularQuery())
      this.buffer.push("\n")
      this.indentation--;
    } else {
      this.buffer.push(" ")
      if (ctx.matchMode()) {
        this.visit(ctx.matchMode())
      }
      this.visit(ctx.patternList())
      if (ctx.whereClause()) {
        this.visit(ctx.whereClause())
      }
      this.buffer.push(" ")

    }
    this.buffer.push("}")
    return ""
  };

  // Handled separately because we want ON CREATE bedfore ON MATCH
  visitMergeClause = (ctx: MergeClauseContext): string => {
    this.visit(ctx.MERGE());
    this.visit(ctx.pattern());
    // ON CREATE should come before ON MATCH
    const mergeActions = ctx.mergeAction_list()
      .map((action, index) => ({ action, index }))
      .sort((a, b) => {
        if (a.action.CREATE() && b.action.MATCH()) {
          return -1;
        } else if (a.action.MATCH() && b.action.CREATE()) {
          return 1;
        }
        return a.index - b.index;
      })
      .map(({ action }) => action);
    mergeActions.forEach((action) => {
      this.visit(action);
    });
    return ctx.getText();
  }

  // Handled separately because it wants indentation
  // https://neo4j.com/docs/cypher-manual/current/styleguide/#cypher-styleguide-indentation-and-line-breaks
  visitMergeAction = (ctx: MergeActionContext): string => {
    if (this.buffer.length > 0) {
      this.buffer.push('\n')
      this.buffer.push(' ')
      this.buffer.push(' ')
    }
    this.visitChildren(ctx);
    return ctx.getText();
  }

  visitMap = (ctx: MapContext): string => {
    this.buffer.push("{")

    const propertyKeyNames = ctx.propertyKeyName_list();
    const expressions = ctx.expression_list();
    for (let i = 0; i < expressions.length; i++) {
      this.buffer.push(propertyKeyNames[i].getText())
      this.buffer.push(": ")
      this.buffer.push(expressions[i].getText());
      if (i != expressions.length - 1) {
        this.buffer.push(", ")
      }
    }
    this.buffer.push("}")
    return ""
  }
}


//const query1 = `MERGE (n) ON CREATE SET n.prop = 0 merge (a:A)-[:T]->(b:B) ON MATCH SET b.name = 'you' ON CREATE SET a.name = 'me' RETURN a.prop`;
//const query2 = `CREATE (n:Label {prop: 0}) WITH n, rand() AS rand RETURN rand, map.propertyKey, count(n)`
//const query3 = `MATCH (a:A) WHERE EXISTS {MATCH (a)-->(b:B) WHERE b.prop = 'yellow'} RETURN a.foo`;
//const query4 = `MATCH (n) WHERE n.name CONTAINS 's' RETURN n.name`;
//const query5 = `MATCH (n)--(m)--(k)--(l) RETURN n, m, k, l`;
//const query6 = `MATCH p=(s)-->(e) WHERE s.name<>e.name RETURN length(p)`;
//const query7 = `MATCH (a:A) WHERE EXISTS {(a)-->(b:B)} RETURN a.prop`;
const query8 = `WITH { key1 :'value' ,key2  :  42 } AS map RETURN map`

export function formatQuery(query: string) {
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
  return visitor.buffer.join('');
}

//formatQuery(query1)
//formatQuery(query2)
//formatQuery(query3)
//formatQuery(query4)
//formatQuery(query5)
//formatQuery(query6)
//formatQuery(query7)
formatQuery(query8)

