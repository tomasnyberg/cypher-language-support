import * as fs from 'fs';
import * as path from 'path';
import { formatQuery } from "./formatting";

const filePath = path.join(__dirname, 'queries_10000.json');
const fileContent = fs.readFileSync(filePath, 'utf-8');

const queries: string[] = JSON.parse(fileContent);
let successful = 0;
const eightCharRegex = /"{1,2}([A-Za-z0-9]{8})"{1,2}\s*$/;
let eightCharErrorCount = 0;
const reasons = new Map<string, number>();
for (const query of queries) {
  try {
    formatQuery(query);
    successful++;
  } catch (e) {
    let reason = e.message.split('near ')[1];
    const test = typeof e.message === 'string' && eightCharRegex.test(e.message)
     || reason === '"trim"';
    if (test) {
      reason = 'Eight char error';
    }
    reasons.set(reason, (reasons.get(reason) || 0) + 1);
    if (test) {
      eightCharErrorCount++;
    } else {
      if (!test) {
        console.log("\n-------------------\n");
        console.log(e.message);
        console.log("\n");
        console.log(query);
        console.log("\n");
      }
    }
  }
}

console.log(`Successfully formatted ${successful} queries out of ${queries.length}`);
console.log(`Not including eight char errors, we successfully formatted: ${successful+eightCharErrorCount} queries out of ${queries.length}`);
console.log(`Eight char error count: ${eightCharErrorCount}`);

console.log("Reasons for errors, ascending order:");
// Print reasons in ascending order
const sortedReasons = Array.from(reasons.entries()).sort((a, b) => a[1] - b[1]);
for (const [reason, count] of sortedReasons) {
  console.log(`${reason}: ${count}`);
}

