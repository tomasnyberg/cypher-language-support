import { TerminalNode } from 'antlr4';
import {
  MergeClauseContext,
  StatementsOrCommandsContext,
} from '../generated-parser/CypherCmdParser';
import CypherCmdParserVisitor from '../generated-parser/CypherCmdParserVisitor';
import { getParseTreeAndTokens } from './formattingHelpers';

class StandardizingVisitor extends CypherCmdParserVisitor<void> {
  buffer = [];

  format = (root: StatementsOrCommandsContext) => {
    this.visit(root);
    return this.buffer.join('');
  };

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

  visitTerminal = (node: TerminalNode) => {
    this.buffer.push(node.getText().toLowerCase());
    this.buffer.push(' ');
  };
}

export function standardizeQuery(query: string): string {
  const { tree } = getParseTreeAndTokens(query);
  const visitor = new StandardizingVisitor();
  return visitor.format(tree);
}
