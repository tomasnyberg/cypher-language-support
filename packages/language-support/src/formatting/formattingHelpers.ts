import { TerminalNode, Token } from "antlr4";
import { lexerKeywords, lexerOperators } from '../lexerSymbols';
import {
  default as CypherCmdLexer,
} from '../generated-parser/CypherCmdLexer';
import { EscapedSymbolicNameStringContext, UnescapedSymbolicNameString_Context } from "../generated-parser/CypherCmdParser";

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

export function is_comment(token: Token) {
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
