import { formatQuery } from '../formatting/../../formatting/visitor';

describe('should format correctly', () => {
  test('on match indentation example', () => {
    const query = `MERGE (n) ON CREATE SET n.prop = 0
MERGE (a:A)-[:T]->(b:B)
ON MATCH SET b.name = 'you'
ON CREATE SET a.name = 'me'
RETURN a.prop`;
    const expected = `MERGE (n)
  ON CREATE SET n.prop = 0
MERGE (a:A)-[:T]->(b:B)
  ON CREATE SET a.name = 'me'
  ON MATCH SET b.name = 'you'
RETURN a.prop`;
    expect(formatQuery(query)).toEqual(expected);
  });

  test('on where exists regular subquery', () => {
    const query = `MATCH (a:A) WHERE EXISTS {MATCH (a)-->(b:B) WHERE b.prop = 'yellow'} RETURN a.foo`;

    const expected = `MATCH (a:A)
WHERE EXISTS {
  MATCH (a)-->(b:B)
  WHERE b.prop = 'yellow'
}
RETURN a.foo`;
    expect(formatQuery(query)).toEqual(expected);
  });

  test('on where exists regular simplified subquery', () => {
    const query = `MATCH (a:A)
WHERE EXISTS {
  (a)-->(b:B)
}
RETURN a.prop`;

    const expected = `MATCH (a:A)
WHERE EXISTS { (a)-->(b:B) }
RETURN a.prop`;
    expect(formatQuery(query)).toEqual(expected);
  });

  //  test('variable names example', () => {
  //    const query = `CREATE (n:Label {prop: 0})
  //WITH n, rand() AS rand, $param AS map
  //RETURN rand, map.propertyKey, count(n)`;
  //    const expected = `CREATE (n:Label {prop: 0})
  //WITH n, rand() AS rand, $param AS map
  //RETURN rand, map.propertyKey, count(n)`
  //    expect(formatQuery(query)).toEqual(expected);
  //
  //  });
});
