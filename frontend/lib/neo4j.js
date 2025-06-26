import neo4j from "neo4j-driver";

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (!uri || !user || !password) {
  throw new Error("Missing Neo4j environment variables. Please set NEO4J_URI, NEO4J_USER, and NEO4J_PASSWORD.");
}

const driver = neo4j.driver(
  uri,
  neo4j.auth.basic(user, password)
);

export async function fetchGraph() {
  const session = driver.session();
  const query = `
    MATCH (a:Author)-[:WROTE]->(b:Book)-[:TAGGED_AS]->(t:Tag)
    RETURN a.name AS author, b.title AS book, collect(t.name) AS tags
    LIMIT 50
  `;
  try {
    const result = await session.run(query);
    return result.records.map(record => ({
      author: record.get("author"),
      book: record.get("book"),
      tags: record.get("tags")
    }));
  } finally {
    await session.close();
  }
}
