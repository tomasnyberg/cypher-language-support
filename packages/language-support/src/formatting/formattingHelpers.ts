import { CharStreams, CommonTokenStream, TerminalNode, Token } from 'antlr4';
import { default as CypherCmdLexer } from '../generated-parser/CypherCmdLexer';
import CypherCmdParser, {
  EscapedSymbolicNameStringContext,
  UnescapedSymbolicNameString_Context,
} from '../generated-parser/CypherCmdParser';
import { lexerKeywords, lexerOperators } from '../lexerSymbols';

export function wantsToBeUpperCase(node: TerminalNode): boolean {
  return isKeywordTerminal(node);
}

export function wantsSpaceBefore(node: TerminalNode): boolean {
  return isKeywordTerminal(node) || lexerOperators.includes(node.symbol.type);
}

export function wantsSpaceAfter(node: TerminalNode): boolean {
  return (
    isKeywordTerminal(node) ||
    lexerOperators.includes(node.symbol.type) ||
    node.symbol.type === CypherCmdLexer.COMMA
  );
}

function isKeywordTerminal(node: TerminalNode): boolean {
  return lexerKeywords.includes(node.symbol.type) && !isSymbolicName(node);
}

export function isComment(token: Token) {
  return (
    token.type === CypherCmdLexer.MULTI_LINE_COMMENT ||
    token.type === CypherCmdLexer.SINGLE_LINE_COMMENT
  );
}

// Variables or property names that have the same name as a keyword should not be
// treated as keywords
function isSymbolicName(node: TerminalNode): boolean {
  return (
    node.parentCtx instanceof UnescapedSymbolicNameString_Context ||
    node.parentCtx instanceof EscapedSymbolicNameStringContext
  );
}

export function getParseTreeAndTokens(query: string) {
  const inputStream = CharStreams.fromString(query);
  const lexer = new CypherCmdLexer(inputStream);
  const tokens = new CommonTokenStream(lexer);
  const parser = new CypherCmdParser(tokens);
  parser.buildParseTrees = true;
  const tree = parser.statementsOrCommands();
  return { tree, tokens };
}
