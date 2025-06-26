'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

type GraphRecord = {
  author: string;
  book: string;
  tags: string[];
};

export default function GraphPage() {
  const [data, setData] = useState<GraphRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<cytoscape.Core | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authorFilter = searchParams.get('author') || '';
  const bookFilter = searchParams.get('book') || '';
  const tagFilter = searchParams.get('tag') || '';
  const relationshipFilter = searchParams.get('relationship') || '';

  useEffect(() => {
    fetch('/api/graph')
      .then(res => res.json())
      .then(({ data }) => {
        // Apply filters
        let filtered = data;
        if (authorFilter) filtered = filtered.filter((row: GraphRecord) => row.author === authorFilter);
        if (bookFilter) filtered = filtered.filter((row: GraphRecord) => row.book === bookFilter);
        if (tagFilter) filtered = filtered.filter((row: GraphRecord) => row.tags.includes(tagFilter));
        if (relationshipFilter) {
          if (relationshipFilter === 'WROTE') {
            // No-op, all rows have WROTE
          } else if (relationshipFilter === 'TAGGED_AS') {
            filtered = filtered.filter((row: GraphRecord) => row.tags.length > 0);
          }
        }
        setData(filtered);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, [authorFilter, bookFilter, tagFilter, relationshipFilter]);

  useEffect(() => {
    if (!loading && !error && cyRef.current) {
      if (cyInstance.current) {
        cyInstance.current.destroy();
        cyInstance.current = null;
      }
      if (data.length === 0) return;
      const elements: cytoscape.ElementDefinition[] = [];
      const nodeSet = new Set<string>();

      data.forEach(({ author, book, tags }) => {
        if (!nodeSet.has(author)) {
          elements.push({ data: { id: author, label: author, type: 'author' } });
          nodeSet.add(author);
        }
        if (!nodeSet.has(book)) {
          elements.push({ data: { id: book, label: book, type: 'book' } });
          nodeSet.add(book);
        }
        if (!relationshipFilter || relationshipFilter === 'WROTE') {
          elements.push({ data: { id: `${author}->${book}`, source: author, target: book, label: 'WROTE' } });
        }
        if ((!relationshipFilter || relationshipFilter === 'TAGGED_AS') && tags.length > 0) {
        tags.forEach(tag => {
          if (!nodeSet.has(tag)) {
              elements.push({ data: { id: tag, label: tag, type: 'tag' } });
            nodeSet.add(tag);
          }
            elements.push({ data: { id: `${book}->${tag}`, source: book, target: tag, label: 'TAGGED_AS' } });
          });
        }
      });

      cyInstance.current = cytoscape({
        container: cyRef.current,
        elements,
        style: [
          {
            selector: 'node[type="author"]',
            style: {
              'background-color': '#2563eb',
              'label': 'data(label)',
              'color': '#fff',
              'font-size': 28,
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 110,
              'height': 110,
              'shape': 'ellipse',
              'border-width': 8,
              'border-color': '#1e40af',
              'text-outline-width': 4,
              'text-outline-color': '#2563eb'
            }
          },
          {
            selector: 'node[type="book"]',
            style: {
              'background-color': '#059669',
              'label': 'data(label)',
              'color': '#fff',
              'font-size': 22,
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 80,
              'height': 80,
              'shape': 'round-rectangle',
              'border-width': 6,
              'border-color': '#065f46',
              'text-outline-width': 3,
              'text-outline-color': '#059669'
            }
          },
          {
            selector: 'node[type="tag"]',
            style: {
              'background-color': '#f59e42',
              'label': 'data(label)',
              'color': '#fff',
              'font-size': 18,
              'font-weight': 'bold',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 60,
              'height': 60,
              'shape': 'hexagon',
              'border-width': 4,
              'border-color': '#b45309',
              'text-outline-width': 3,
              'text-outline-color': '#f59e42'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#888',
              'target-arrow-color': '#888',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': 10,
              'color': '#333',
              'text-background-color': '#fff',
              'text-background-opacity': 1,
              'text-background-padding': "2"
            }
          }
        ],
        layout: {
          name: 'cose-bilkent',
          animate: 'end',
          fit: true,
          padding: 120,
          nodeRepulsion: 300000,
          idealEdgeLength: 300,
          edgeElasticity: 0.1,
          nestingFactor: 1.2,
          gravity: 0.15,
          numIter: 3000,
        } as unknown as cytoscape.LayoutOptions
      });
    }
    // Clean up on unmount
      return () => {
      if (cyInstance.current) {
        cyInstance.current.destroy();
        cyInstance.current = null;
    }
    };
  }, [loading, error, data, relationshipFilter]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-white to-gray-100 dark:from-black dark:to-gray-900 p-8">
      <h1 className="mb-6 text-center text-3xl font-bold text-gray-800 dark:text-gray-100">
        Neo4j Book Graph
      </h1>
      <button
        onClick={() => router.push('/')}
        className="mb-8 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
      >
        Back to Table
      </button>
      {loading && <p className="text-lg text-gray-500">Loading data…</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="w-full max-w-5xl flex flex-col gap-8">
          <div
            ref={cyRef}
            style={{ height: 500, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}
            className="dark:bg-gray-800"
          />
        </div>
      )}
      <footer className="mt-10 text-sm text-gray-400">
        Powered by Next.js &amp; Neo4j
      </footer>
    </main>
  );
}