import { CharStreams, CommonTokenStream, TerminalNode } from "antlr4";
import CypherCmdLexer from "../generated-parser/CypherCmdLexer";
import CypherLexer from "../generated-parser/CypherCmdLexer";
import CypherCmdParser, { ArrowLineContext, BooleanLiteralContext, ClauseContext, CountStarContext, EscapedSymbolicNameStringContext, ExistsExpressionContext, KeywordLiteralContext, LabelExpressionContext, LeftArrowContext, ListLiteralContext, LiteralContext, MapContext, MergeActionContext, MergeClauseContext, NodePatternContext, OrderByContext, PatternListContext, PropertyContext, RelationshipPatternContext, ReturnItemsContext, RightArrowContext, UnescapedSymbolicNameStringContext, UnescapedSymbolicNameString_Context, WhereClauseContext } from "../generated-parser/CypherCmdParser";
import CypherCmdParserVisitor from "../generated-parser/CypherCmdParserVisitor";
import { lexerKeywords, lexerOperators } from "../lexerSymbols";
import { Token } from "antlr4";

function wantsToBeUpperCase(node: TerminalNode): boolean {
  return isKeywordTerminal(node);
}

function wantsSpaceBefore(node: TerminalNode): boolean {
  return isKeywordTerminal(node) ||
    lexerOperators.includes(node.symbol.type);
}

function wantsSpaceAfter(node: TerminalNode): boolean {
  return isKeywordTerminal(node) ||
    lexerOperators.includes(node.symbol.type) || node.symbol.type === CypherCmdLexer.COMMA;
}

function isKeywordTerminal(node: TerminalNode): boolean {
  return lexerKeywords.includes(node.symbol.type) && !isSymbolicName(node);
}

function is_comment(token: Token) {
  return token.type === CypherCmdLexer.MULTI_LINE_COMMENT
    || token.type === CypherCmdLexer.SINGLE_LINE_COMMENT;
}

// Variables or property names that have the same name as a keyword should not be
// treated as keywords
function isSymbolicName(node: TerminalNode): boolean {
  return node.parentCtx instanceof UnescapedSymbolicNameString_Context
    || node.parentCtx instanceof EscapedSymbolicNameStringContext;
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
    const commentTokens = (hiddenTokens || []).filter((token) => is_comment(token));
    for (const commentToken of commentTokens) {
      this.buffer.push(commentToken.text.trim());
      this.buffer.push('\n');
    }
  }

  addCommentsAfter = (node: TerminalNode) => {
    const token = node.symbol;
    const hiddenTokens = this.tokenStream.getHiddenTokensToRight(token.tokenIndex);
    const commentTokens = (hiddenTokens || []).filter((token) => is_comment(token));
    for (const commentToken of commentTokens) {
      if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] !== ' ' &&
        this.buffer[this.buffer.length - 1] !== '\n') {
        this.buffer.push(' ');
      }
      this.buffer.push(commentToken.text.trim());
      this.breakLine();
    }
  }

  breakLine = () => {
    if (this.buffer.length > 0 && this.buffer[this.buffer.length - 1] !== '\n') {
      this.buffer.push('\n');
    }
  }


  // Handled separately because clauses shuold have newlines
  visitClause = (ctx: ClauseContext): string => {
    this.breakLine();
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

  visitCountStar = (ctx: CountStarContext): string => {
    this.buffer.push(ctx.COUNT().getText());
    this.visit(ctx.LPAREN());
    this.buffer.push('*');
    this.visit(ctx.RPAREN());
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
      if (wantsSpaceBefore(node)) {
        this.buffer.push(' ');
      }
    }
    if (node.symbol.type === CypherCmdLexer.EOF) {
      return node.getText();
    }
    if (wantsToBeUpperCase(node)) {
      this.buffer.push(node.getText().toUpperCase());
    } else {
      this.buffer.push(node.getText());
    }
    if (wantsSpaceAfter(node)) {
      this.buffer.push(' ');
    }
    this.addCommentsAfter(node);
    return node.getText();
  }

  visitBooleanLiteral = (ctx: BooleanLiteralContext): string => {
    this.buffer.push(ctx.getText().toLowerCase());
    return ctx.getText();
  }

  visitKeywordLiteral = (ctx: KeywordLiteralContext): string => {
    if (ctx.NULL()) {
      this.buffer.push(ctx.getText().toLowerCase());
    } else if (ctx.NAN()) {
      this.buffer.push("NaN");
    } else {
      this.buffer.push(ctx.getText());
    }
    return ctx.getText();
  }

  // The patterns are handled separately because we need spaces 
  // between labels and property predicates in patterns
  handleInnerPatternContext = (ctx: NodePatternContext | RelationshipPatternContext) => {
    if (ctx.variable()) {
      this.visit(ctx.variable());
    }
    if (ctx.labelExpression()) {
      this.visit(ctx.labelExpression());
    }
    if (ctx.labelExpression() && ctx.properties()) {
      this.buffer.push(' ');
    }
    if (ctx.properties()) {
      this.visit(ctx.properties());
    }
    if (ctx.WHERE()) {
      this.visit(ctx.WHERE());
      this.visit(ctx.expression());
    }
  }

  visitNodePattern = (ctx: NodePatternContext): string => {
    this.visit(ctx.LPAREN());
    this.handleInnerPatternContext(ctx);
    this.visit(ctx.RPAREN());
    return ctx.getText();
  }

  visitRelationshipPattern = (ctx: RelationshipPatternContext): string => {
    if (ctx.leftArrow()) {
      this.visit(ctx.leftArrow());
    }
    // TODO: the buffer.push('-') might have to be handled differently, as this doesn't
    // visit the terminal and thus might miss e.g. comments.
    this.buffer.push('-');
    if (ctx.LBRACKET()) {
      this.visit(ctx.LBRACKET());
      this.handleInnerPatternContext(ctx);
      this.visit(ctx.RBRACKET());
    }
    this.buffer.push('-');
    if (ctx.rightArrow()) {
      this.visit(ctx.rightArrow());
    }
    return ctx.getText();
  }

  // Handled separately because the dot is not an operator
  visitProperty = (ctx: PropertyContext): string => {
    this.buffer.push('.');
    this.visit(ctx.propertyKeyName());
    return ctx.getText();
  }

  // Handled separately because where is not a clause (it is a subclause)
  visitWhereClause = (ctx: WhereClauseContext): string => {
    this.breakLine();
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
      this.breakLine();
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
    const commaList = ctx.COMMA_list();
    for (let i = 0; i < expressions.length; i++) {
      this.buffer.push(propertyKeyNames[i].getText())
      this.buffer.push(": ")
      this.buffer.push(expressions[i].getText());
      if (i < expressions.length - 1) {
        this.visit(commaList[i]);
      }
    }
    this.buffer.push("}")
    return ""
  }
}

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
  return visitor.buffer.join('').trim();
}

