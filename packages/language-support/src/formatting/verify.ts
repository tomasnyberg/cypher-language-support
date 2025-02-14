import { CharStreams, CommonTokenStream } from 'antlr4';
import * as fs from 'fs';
import * as path from 'path';
import CypherCmdLexer from '../generated-parser/CypherCmdLexer';
import CypherCmdParser from '../generated-parser/CypherCmdParser';
import { formatQuery } from "./formatting";
import {
  FormatterErrorsListener,
} from './formattingHelpers';
import { standardizeQuery } from './standardizer';

function verifyFormatting(query: string): void {
  const formatted = formatQuery(query);
  const queryStandardized = standardizeQuery(query);
  const formattedStandardized = standardizeQuery(formatted);
  // AST integrity check
  if (formattedStandardized !== queryStandardized) {
    throw new Error(
      `Standardized query does not match standardized formatted query`,
    );
  }
  // Idempotency check
  const formattedTwice = formatQuery(formatted);
  if (formattedTwice !== formatted) {
    throw new Error(
      `Formatting is not idempotent`,
    );
  }
}

const filePath = path.join(__dirname, 'queries_10000.json');
const fileContent = fs.readFileSync(filePath, 'utf-8');

const queries: string[] = JSON.parse(fileContent);
let badQueries = 0;
let successful = 0;
const reasons = new Map<string, number>();
for (const query of queries) {
  try {
    const inputStream = CharStreams.fromString(query);
    const lexer = new CypherCmdLexer(inputStream);
    const tokens = new CommonTokenStream(lexer);
    const parser = new CypherCmdParser(tokens);
    parser.removeErrorListeners();
    parser.addErrorListener(new FormatterErrorsListener());
    parser.statementsOrCommands();
  } catch (e) {
    badQueries++;
    continue;
  }
  try {
    verifyFormatting(query);
    successful++;
  } catch (e) {
    let reason = e.message.split('near ')[1];
    reasons.set(reason, (reasons.get(reason) || 0) + 1);
    console.log("\n-------------------\n");
    console.log(e);
    console.log(e.message);
    console.log("\n");
    console.log(query);
    console.log("\n");
  }
}

const goodQueries = queries.length - badQueries;
console.log(`Successfully formatted ${successful} queries out of ${goodQueries}`);
