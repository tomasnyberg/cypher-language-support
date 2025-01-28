import { CharStreams, CommonTokenStream, TerminalNode } from 'antlr4';
import { default as CypherLexer } from '../generated-parser/CypherCmdLexer';
import CypherCmdParser, {
  MergeClauseContext,
  StatementsOrCommandsContext,
} from '../generated-parser/CypherCmdParser';
import CypherCmdParserVisitor from '../generated-parser/CypherCmdParserVisitor';

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
  const inputStream = CharStreams.fromString(query);
  const lexer = new CypherLexer(inputStream);
  const tokens = new CommonTokenStream(lexer);
  const parser = new CypherCmdParser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.statementsOrCommands();
  const visitor = new StandardizingVisitor();
  return visitor.format(tree);
}
