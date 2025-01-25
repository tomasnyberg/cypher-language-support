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

  test('Using wrapper space around operators', () => {
    const query = `MATCH p=(s)-->(e)
WHERE s.name<>e.name
RETURN length(p)`;

    const expected = `MATCH p = (s)-->(e)
WHERE s.name <> e.name
RETURN length(p)`;
    expect(formatQuery(query)).toEqual(expected);
  });

  test('formats maps properly', () => {
    const query = `WITH { key1 :'value' ,key2  :  42 } AS map RETURN map`;
    const expected = `WITH {key1: 'value', key2: 42} AS map
RETURN map`;
    expect(formatQuery(query)).toEqual(expected);
  });

  test('Test visitOrderBy', () => {
    const query = `RETURN user.id ORDER BY potential_reach, like_count;`;
    const expected = `RETURN user.id ORDER BY potential_reach, like_count;`;
    expect(formatQuery(query)).toEqual(expected);
  });

  test('basic inline comments', () => {
    const inlinecomments = `
MERGE (n) ON CREATE SET n.prop = 0 // Ensure 'n' exists and initialize 'prop' to 0 if created
MERGE (a:A)-[:T]->(b:B)           // Create or match a relationship from 'a:A' to 'b:B'
ON MATCH SET b.name = 'you'       // If 'b' already exists, set its 'name' to 'you'
ON CREATE SET a.name = 'me'       // If 'a' is created, set its 'name' to 'me'
RETURN a.prop                     // Return the 'prop' of 'a'
`;
    const expected = `MERGE (n)
  ON CREATE SET n.prop = 0 // Ensure 'n' exists and initialize 'prop' to 0 if created
MERGE (a:A)-[:T]->(b:B) // Create or match a relationship from 'a:A' to 'b:B'
  ON CREATE SET a.name = 'me' // If 'a' is created, set its 'name' to 'me'
  ON MATCH SET b.name = 'you' // If 'b' already exists, set its 'name' to 'you'
RETURN a.prop`
    expect(formatQuery(inlinecomments)).toEqual(expected);

  })
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
