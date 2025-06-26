import pandas as pd
from neo4j import GraphDatabase
import csv
from dotenv import load_dotenv
import os
from tqdm import tqdm

# Load env variables
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE") or "neo4j"  # fallback to 'neo4j'

# Read CSV with delimiter auto-detection
def read_csv_with_sniffer(filename):
    with open(filename, "r", encoding="utf-8") as f:
        sample = f.read(2048)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample)
        df = pd.read_csv(f, delimiter=dialect.delimiter)
        df.columns = df.columns.str.strip()
        return df

books = read_csv_with_sniffer("books.csv")
tags = read_csv_with_sniffer("tags.csv")
book_tags = read_csv_with_sniffer("book_tags.csv")

print("Books columns:", books.columns.tolist())
print("Tags columns:", tags.columns.tolist())
print("Book_tags columns:", book_tags.columns.tolist())

driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def safe_int(val, default=None):
    try:
        return int(val)
    except Exception:
        return default

def upload(tx):
    print("\n📚 Uploading Books...")
    for _, row in tqdm(books.iterrows(), total=books.shape[0], desc="Books"):
        try:
            book_id = safe_int(row.get("book_id"))
            title = row.get("title", "")
            author = row.get("authors", "")
            if book_id is not None:
                tx.run(
                    """
                    MERGE (b:Book {id: $id})
                    SET b.title = $title
                    MERGE (a:Author {name: $author})
                    MERGE (a)-[:WROTE]->(b)
                    """,
                    id=book_id,
                    title=title,
                    author=author
                )
        except Exception as e:
            print(f"[Book Error] {row.get('book_id', 'N/A')} - {e}")

    print("\n🏷️ Uploading Tags...")
    for _, row in tqdm(tags.iterrows(), total=tags.shape[0], desc="Tags"):
        try:
            tag_id = safe_int(row.get("tag_id"))
            tag_name = row.get("tag_name", "")
            if tag_id is not None:
                tx.run(
                    "MERGE (t:Tag {tag_id: $id}) SET t.name = $name",
                    id=tag_id,
                    name=tag_name
                )
        except Exception as e:
            print(f"[Tag Error] {row.get('tag_id', 'N/A')} - {e}")

    print("\n🔗 Uploading Book-Tag Relationships...")
    for _, row in tqdm(book_tags.iterrows(), total=book_tags.shape[0], desc="BookTags"):
        try:
            bid = safe_int(row.get("goodreads_book_id"))
            tid = safe_int(row.get("tag_id"))
            count = safe_int(row.get("count"))
            if bid is not None and tid is not None and count is not None:
                tx.run(
                    """
                    MATCH (b:Book {id: $bid}), (t:Tag {tag_id: $tid})
                    MERGE (b)-[:TAGGED_AS {count: $count}]->(t)
                    """,
                    bid=bid,
                    tid=tid,
                    count=count
                )
        except Exception as e:
            print(f"[BookTag Error] BookID {row.get('goodreads_book_id', 'N/A')} - {e}")

try:
    with driver.session(database=NEO4J_DATABASE) as session:
        session.execute_write(upload)
    print("\n✅ Data uploaded to Neo4j successfully!")
except Exception as e:
    print(f"\n❌ Failed to upload data: {e}")
