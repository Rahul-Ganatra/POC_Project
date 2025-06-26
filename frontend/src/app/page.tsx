'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type GraphRecord = {
  author: string;
  book: string;
  tags: string[];
};

type RelationshipRow = {
  author: string;
  book: string;
  tag: string | null;
  relationship: 'WROTE' | 'TAGGED_AS';
};

export default function Home() {
  const [, setData] = useState<GraphRecord[]>([]);
  const [rows, setRows] = useState<RelationshipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // Filter state
  const [authorFilter, setAuthorFilter] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('');

  useEffect(() => {
    fetch('/api/graph')
      .then(res => res.json())
      .then(({ data }) => {
        setData(data);
        setLoading(false);

        // Flatten data into relationship rows
        const relRows: RelationshipRow[] = [];
        data.forEach((row: GraphRecord) => {
          // WROTE relationship
          relRows.push({
            author: row.author,
            book: row.book,
            tag: null,
            relationship: 'WROTE'
          });
          // TAGGED_AS relationships
          row.tags.forEach(tag => {
            relRows.push({
              author: row.author,
              book: row.book,
              tag,
              relationship: 'TAGGED_AS'
            });
          });
        });
        setRows(relRows);
      })
      .catch(() => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

  // Unique filter options
  const authors = Array.from(new Set(rows.map(r => r.author))).sort();
  const books = Array.from(new Set(rows.map(r => r.book))).sort();
  const tags = Array.from(new Set(rows.filter(r => r.tag).map(r => r.tag!))).sort();
  const relationships = ['WROTE', 'TAGGED_AS'];

  // Filtered rows
  const filteredRows = rows.filter(row =>
    (authorFilter ? row.author === authorFilter : true) &&
    (bookFilter ? row.book === bookFilter : true) &&
    (tagFilter ? row.tag === tagFilter : true) &&
    (relationshipFilter ? row.relationship === relationshipFilter : true)
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white to-gray-100 dark:from-black dark:to-gray-900 p-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-gray-800 dark:text-gray-100">
        Neo4j Book Relationships
      </h1>
      <button
        onClick={() =>
          router.push(
            `/graph?author=${encodeURIComponent(authorFilter)}&book=${encodeURIComponent(bookFilter)}&tag=${encodeURIComponent(tagFilter)}&relationship=${encodeURIComponent(relationshipFilter)}`
          )
        }
        className="mb-8 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
      >
        View Graph Structure
      </button>

      {/* Filter Section */}
      <div className="w-full max-w-4xl mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Author</label>
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
            value={authorFilter}
            onChange={e => setAuthorFilter(e.target.value)}
          >
            <option value="">All</option>
            {authors.map(author => (
              <option key={author} value={author}>{author}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Book</label>
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
            value={bookFilter}
            onChange={e => setBookFilter(e.target.value)}
          >
            <option value="">All</option>
            {books.map(book => (
              <option key={book} value={book}>{book}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Tag</label>
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
          >
            <option value="">All</option>
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Relationship</label>
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-400"
            value={relationshipFilter}
            onChange={e => setRelationshipFilter(e.target.value)}
          >
            <option value="">All</option>
            {relationships.map(rel => (
              <option key={rel} value={rel}>{rel}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-lg text-gray-500">Loading data…</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="w-full max-w-4xl overflow-x-auto rounded-lg shadow-lg bg-white dark:bg-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-blue-600 dark:bg-blue-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Book</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Tag</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Relationship</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={
                    idx % 2 === 0
                      ? 'bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900 transition'
                      : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition'
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{row.author}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.book}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.tag ?? '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{row.relationship}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="mt-10 text-sm text-gray-400">
        Powered by Next.js &amp; Neo4j
      </footer>
    </main>
  );
}
