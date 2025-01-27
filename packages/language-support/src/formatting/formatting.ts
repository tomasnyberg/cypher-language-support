import { CharStreams, CommonTokenStream, TerminalNode } from 'antlr4';
import {
  default as CypherCmdLexer,
  default as CypherLexer,
} from '../generated-parser/CypherCmdLexer';
import CypherCmdParser, {
  ArrowLineContext,
  BooleanLiteralContext,
  ClauseContext,
  CountStarContext,
  ExistsExpressionContext,
  KeywordLiteralContext,
  LabelExpressionContext,
  LeftArrowContext,
  MapContext,
  MergeActionContext,
  MergeClauseContext,
  NodePatternContext,
  NumberLiteralContext,
  PropertyContext,
  RelationshipPatternContext,
  RightArrowContext,
  WhereClauseContext,
} from '../generated-parser/CypherCmdParser';
import CypherCmdParserVisitor from '../generated-parser/CypherCmdParserVisitor';
import {
  wantsSpaceAfter, wantsSpaceBefore, wantsToBeUpperCase
  , is_comment,
} from './formattingHelpers';


export class TreePrintVisitor extends CypherCmdParserVisitor<void> {
  buffer: string[] = [];
  indentation = 0;

  constructor(private tokenStream: CommonTokenStream) {
    super();
  }

  breakLine = () => {
    if (
      this.buffer.length > 0 &&
      this.buffer[this.buffer.length - 1] !== '\n'
    ) {
      this.buffer.push('\n');
    }
  };

  addIndentation = () => this.indentation++;

  removeIndentation = () => this.indentation--;

  // Comments are in the hidden channel, so grab them manually
  addCommentsBefore = (node: TerminalNode) => {
    const token = node.symbol;
    const hiddenTokens = this.tokenStream.getHiddenTokensToLeft(
      token.tokenIndex,
    );
    const commentTokens = (hiddenTokens || []).filter((token) =>
      is_comment(token),
    );
    for (const commentToken of commentTokens) {
      this.buffer.push(commentToken.text.trim());
      this.buffer.push('\n');
    }
  };

  addCommentsAfter = (node: TerminalNode) => {
    const token = node.symbol;
    const hiddenTokens = this.tokenStream.getHiddenTokensToRight(
      token.tokenIndex,
    );
    const commentTokens = (hiddenTokens || []).filter((token) =>
      is_comment(token),
    );
    for (const commentToken of commentTokens) {
      if (
        this.buffer.length > 0 &&
        this.buffer[this.buffer.length - 1] !== ' ' &&
        this.buffer[this.buffer.length - 1] !== '\n'
      ) {
        this.buffer.push(' ');
      }
      this.buffer.push(commentToken.text.trim());
      this.breakLine();
    }
  };


  visitClause = (ctx: ClauseContext) => {
    this.breakLine();
    this.visitChildren(ctx);
  };

  // Visit these separately because operators want spaces around them,
  // and these are not operators (despite being minuses).
  visitArrowLine = (ctx: ArrowLineContext) => {
    this.visitTerminalRaw(ctx.ARROW_LINE());
  };

  visitRightArrow = (ctx: RightArrowContext) => {
    this.visitTerminalRaw(ctx.GT());
  };

  visitLeftArrow = (ctx: LeftArrowContext) => {
    this.visitTerminalRaw(ctx.LT());
  };

  visitCountStar = (ctx: CountStarContext) => {
    this.buffer.push(ctx.COUNT().getText());
    this.visit(ctx.LPAREN());
    this.visitTerminalRaw(ctx.TIMES());
    this.visit(ctx.RPAREN());
  };

  // Handled separately to avoid spaces between a minus and a number
  visitNumberLiteral = (ctx: NumberLiteralContext) => {
    if (ctx.MINUS()) {
      this.visitTerminalRaw(ctx.MINUS());
    }
    if (ctx.DECIMAL_DOUBLE()) {
      this.visit(ctx.DECIMAL_DOUBLE());
    }
    if (ctx.UNSIGNED_DECIMAL_INTEGER()) {
      this.visit(ctx.UNSIGNED_DECIMAL_INTEGER());
    }
    if (ctx.UNSIGNED_HEX_INTEGER()) {
      this.visit(ctx.UNSIGNED_HEX_INTEGER());
    }
    if (ctx.UNSIGNED_OCTAL_INTEGER()) {
      this.visit(ctx.UNSIGNED_OCTAL_INTEGER());
    }
  }

  // Handled separately since otherwise they will get weird spacing
  // TODO: doesn't handle the special label expressions yet
  // (labelExpression3 etc)
  visitLabelExpression = (ctx: LabelExpressionContext) => {
    if (ctx.COLON()) {
      this.visitTerminalRaw(ctx.COLON());
    }
    if (ctx.IS()) {
      this.visitTerminalRaw(ctx.IS());
    }
    this.visit(ctx.labelExpression4());
  };

  visitTerminal = (node: TerminalNode) => {
    if (this.buffer.length === 0) {
      this.addCommentsBefore(node);
    }
    if (
      this.buffer.length > 0 &&
      this.buffer[this.buffer.length - 1] === '\n'
    ) {
      for (let i = 0; i < this.indentation; i++) {
        this.buffer.push(' ');
        this.buffer.push(' ');
      }
    }

    if (
      this.buffer.length > 0 &&
      this.buffer[this.buffer.length - 1] !== '\n' &&
      this.buffer[this.buffer.length - 1] !== ' '
    ) {
      if (wantsSpaceBefore(node)) {
        this.buffer.push(' ');
      }
    }
    if (node.symbol.type === CypherCmdLexer.EOF) {
      return;
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
  };

  // Some terminals don't want to have the regular rules applied to them,
  // for instance the . in properties should be handled in a "raw" manner to
  // avoid getting spaces around it (since it is an operator and operators want spaces)
  visitTerminalRaw = (node: TerminalNode) => {
    if (this.buffer.length === 0) {
      this.addCommentsBefore(node);
    }
    this.buffer.push(node.getText());
    this.addCommentsAfter(node);
  }

  // TODO add options to visit raw or smth so that we can get it lowercased
  visitBooleanLiteral = (ctx: BooleanLiteralContext) => {
    this.buffer.push(ctx.getText().toLowerCase());
  };

  visitKeywordLiteral = (ctx: KeywordLiteralContext) => {
    if (ctx.NULL()) {
      this.buffer.push(ctx.getText().toLowerCase());
    } else if (ctx.NAN()) {
      this.buffer.push('NaN');
    } else {
      this.buffer.push(ctx.getText());
    }
  };

  // The patterns are handled separately because we need spaces
  // between labels and property predicates in patterns
  handleInnerPatternContext = (
    ctx: NodePatternContext | RelationshipPatternContext,
  ) => {
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
  };

  visitNodePattern = (ctx: NodePatternContext) => {
    this.visit(ctx.LPAREN());
    this.handleInnerPatternContext(ctx);
    this.visit(ctx.RPAREN());
  };

  visitRelationshipPattern = (ctx: RelationshipPatternContext) => {
    if (ctx.leftArrow()) {
      this.visit(ctx.leftArrow());
    }
    const arrowLineList = ctx.arrowLine_list();
    this.visitTerminalRaw(arrowLineList[0].MINUS())
    if (ctx.LBRACKET()) {
      this.visit(ctx.LBRACKET());
      this.handleInnerPatternContext(ctx);
      this.visit(ctx.RBRACKET());
    }
    this.visitTerminalRaw(arrowLineList[1].MINUS())
    if (ctx.rightArrow()) {
      this.visit(ctx.rightArrow());
    }
  };

  // Handled separately because the dot is not an operator
  visitProperty = (ctx: PropertyContext) => {
    this.visitTerminalRaw(ctx.DOT());
    this.visit(ctx.propertyKeyName());
  };

  // Handled separately because where is not a clause (it is a subclause)
  visitWhereClause = (ctx: WhereClauseContext) => {
    this.breakLine();
    this.visitChildren(ctx);
  };

  // Handled separately because it contains subclauses (and thus indentation rules)
  visitExistsExpression = (ctx: ExistsExpressionContext) => {
    this.visit(ctx.EXISTS());
    this.visit(ctx.LCURLY());
    if (ctx.regularQuery()) {
      this.addIndentation();
      this.visit(ctx.regularQuery());
      this.breakLine();
      this.removeIndentation();
    } else {
      this.buffer.push(' ');
      if (ctx.matchMode()) {
        this.visit(ctx.matchMode());
      }
      this.visit(ctx.patternList());
      if (ctx.whereClause()) {
        this.visit(ctx.whereClause());
      }
      this.buffer.push(' ');
    }
    this.visit(ctx.RCURLY());
  };

  // Handled separately because we want ON CREATE before ON MATCH
  visitMergeClause = (ctx: MergeClauseContext) => {
    this.visit(ctx.MERGE());
    this.visit(ctx.pattern());
    const mergeActions = ctx
      .mergeAction_list()
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
  };

  // Handled separately because it wants indentation
  // https://neo4j.com/docs/cypher-manual/current/styleguide/#cypher-styleguide-indentation-and-line-breaks
  visitMergeAction = (ctx: MergeActionContext) => {
    if (this.buffer.length > 0) {
      this.breakLine();
      this.buffer.push(' ');
      this.buffer.push(' ');
    }
    this.visitChildren(ctx);
  };

  // Map has its own formatting rules, see:
  // https://neo4j.com/docs/cypher-manual/current/styleguide/#cypher-styleguide-spacing
  visitMap = (ctx: MapContext) => {
    this.visit(ctx.LCURLY());

    const propertyKeyNames = ctx.propertyKeyName_list();
    const expressions = ctx.expression_list();
    const commaList = ctx.COMMA_list();
    const colonList = ctx.COLON_list();
    for (let i = 0; i < expressions.length; i++) {
      this.visit(propertyKeyNames[i]);
      this.visitTerminalRaw(colonList[i]);
      this.buffer.push(' ');
      this.visit(expressions[i]);
      if (i < expressions.length - 1) {
        this.visit(commaList[i]);
      }
    }
    this.visit(ctx.RCURLY());
  };
}

export function formatQuery(query: string) {
  const inputStream = CharStreams.fromString(query);
  const lexer = new CypherLexer(inputStream);
  const tokens = new CommonTokenStream(lexer);
  const parser = new CypherCmdParser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.statementsOrCommands();
  const visitor = new TreePrintVisitor(tokens);
  visitor.visit(tree);
  return visitor.buffer.join('').trim();
}
