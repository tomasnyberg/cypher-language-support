import { CharStreams, CommonTokenStream, TerminalNode } from "antlr4";
import CypherCmdLexer from "../generated-parser/CypherCmdLexer";
import CypherLexer from "../generated-parser/CypherCmdLexer";
import CypherCmdParser, { ArrowLineContext, ClauseContext, ExistsExpressionContext, LabelExpressionContext, LeftArrowContext, MapContext, MergeActionContext, MergeClauseContext, OrderByContext, PropertyContext, ReturnItemsContext, RightArrowContext, UnescapedSymbolicNameStringContext, WhereClauseContext } from "../generated-parser/CypherCmdParser";
import CypherCmdParserVisitor from "../generated-parser/CypherCmdParserVisitor";
import { lexerKeywords, lexerOperators } from "../lexerSymbols";

function wantsSpaces(tokenType: number): boolean {
  return lexerKeywords.includes(tokenType) ||
    lexerOperators.includes(tokenType);
}

export class TreePrintVisitor extends CypherCmdParserVisitor<string> {
  buffer: string[] = [];
  indentation = 0

  constructor(private tokenStream: CommonTokenStream) {
    super();
  }

  addCommentsBefore = (node: TerminalNode) => {
    const token = node.symbol;
    const hiddenTokens = this.tokenStream.getHiddenTokensToLeft(token.tokenIndex);
    const commentTokens = (hiddenTokens || []).filter((token) => token.type == 12 || token.type == 13);
    for (const commentToken of commentTokens) {
      this.buffer.push(commentToken.text.trim());
      this.buffer.push('\n');
    }
  }

  addCommentsAfter = (node: TerminalNode) => {
    const token = node.symbol;
    const hiddenTokens = this.tokenStream.getHiddenTokensToRight(token.tokenIndex);
    const commentTokens = (hiddenTokens || []).filter((token) => token.type == 12 || token.type == 13);
    for (const commentToken of commentTokens) {
      if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] !== ' ') {
        this.buffer.push(' ');
      }
      this.buffer.push(commentToken.text.trim());
    }
  }


  // Handled separately because clauses shuold have newlines
  visitClause = (ctx: ClauseContext): string => {
    if (this.buffer.length > 0) {
      this.buffer.push('\n')
    }
    this.visitChildren(ctx);
    return ctx.getText();
  }

  // Visit these separately because operators want spaces around them, 
  // and these are not operators (despite being minuses).
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

  // Handled separately since otherwise they will get weird spacing
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
    if (this.buffer.length === 0) {
      this.addCommentsBefore(node);
    }
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
    this.addCommentsAfter(node);
    return node.getText();
  }

  // Visit symbolic names here rather than in terminal so we don't mistake them as keywords
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

  visitOrderBy = (ctx: OrderByContext): string => {
    this.visit(ctx.ORDER())
    this.visit(ctx.BY())
    ctx.orderItem_list().forEach((item, idx) => {
      this.visit(item);
      if (idx < ctx.orderItem_list().length - 1) {
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

  // Handled separately because it contains subclauses (and thus indentation rules)
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

  // Map has its formatting rules, see:
  // https://neo4j.com/docs/cypher-manual/current/styleguide/#cypher-styleguide-spacing
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

const inlinecomments = `
// This is a comment before everything
MERGE (n) ON CREATE SET n.prop = 0 // Ensure 'n' exists and initialize 'prop' to 0 if created
MERGE (a:A)-[:T]->(b:B)           // Create or match a relationship from 'a:A' to 'b:B'
ON MATCH SET b.name = 'you'       // If 'b' already exists, set its 'name' to 'you'
ON CREATE SET a.name = 'me'       // If 'a' is created, set its 'name' to 'me'
RETURN a.prop                     // Return the 'prop' of 'a'
`;


export function formatQuery(query: string) {
  const inputStream = CharStreams.fromString(query);
  const lexer = new CypherLexer(inputStream);
  const tokens = new CommonTokenStream(lexer);
  const parser = new CypherCmdParser(tokens);
  parser.buildParseTrees = true
  const tree = parser.statementsOrCommands()
  const visitor = new TreePrintVisitor(tokens);
  visitor.visit(tree);
  console.log(visitor.buffer.join(''))
  return visitor.buffer.join('');
}
formatQuery(inlinecomments)

