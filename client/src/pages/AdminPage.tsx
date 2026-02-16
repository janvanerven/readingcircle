import { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Shield, Download, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { BOOK_TYPES } from '@readingcircle/shared';

const CSV_HEADERS = ['title', 'author', 'year', 'country', 'originalLanguage', 'type', 'introduction'] as const;

interface ParsedRow {
  title: string;
  author: string;
  year: string;
  country: string;
  originalLanguage: string;
  type: string;
  introduction: string;
}

interface ImportResult {
  imported: number;
  errors: { row: number; error: string }[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0]!;
  const header = headerLine.split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const headerMap = new Map(header.map((h, i) => [h.toLowerCase(), i]));

  const getIndex = (name: string) => headerMap.get(name.toLowerCase()) ?? -1;

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]!);
    rows.push({
      title: values[getIndex('title')] || '',
      author: values[getIndex('author')] || '',
      year: values[getIndex('year')] || '',
      country: values[getIndex('country')] || '',
      originalLanguage: values[getIndex('originallanguage')] || '',
      type: values[getIndex('type')] || '',
      introduction: values[getIndex('introduction')] || '',
    });
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  values.push(current.trim());
  return values;
}

export function AdminPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState('');

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const downloadTemplate = () => {
    const content = CSV_HEADERS.join(',') + '\n';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'books_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setFileError('No data rows found in the CSV file.');
        setPreview([]);
        return;
      }
      const valid = rows.filter(r => r.title && r.author);
      if (valid.length === 0) {
        setFileError('No rows with both title and author found.');
        setPreview([]);
        return;
      }
      setPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setResult(null);
    try {
      const data = await api<ImportResult>('/books/import', {
        method: 'POST',
        body: JSON.stringify({ books: preview }),
      });
      setResult(data);
      setPreview([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const clearPreview = () => {
    setPreview([]);
    setFileError('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-burgundy flex items-center gap-3">
        <Shield className="w-8 h-8" />
        Admin Panel
      </h1>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg">Bulk Import Books</h2>
        <p className="text-sm text-brown-light">
          Upload a CSV file to import multiple books at once. Each row must have at least a title and author.
          Valid types: {BOOK_TYPES.join(', ')}.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-warm-gray text-brown hover:bg-warm-gray-light rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download CSV Template
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />
            Select CSV File
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {fileError && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {fileError}
          </div>
        )}

        {result && (
          <div className="bg-sage/10 border border-sage/30 px-4 py-3 rounded-lg text-sm space-y-1">
            <div className="flex items-center gap-2 text-sage-dark font-medium">
              <CheckCircle className="w-4 h-4" />
              {result.imported} book{result.imported !== 1 ? 's' : ''} imported successfully.
            </div>
            {result.errors.length > 0 && (
              <div className="text-brown-light mt-2">
                <p className="font-medium text-brown">{result.errors.length} row{result.errors.length !== 1 ? 's' : ''} skipped:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {result.errors.map((err, i) => (
                    <li key={i}>Row {err.row}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-brown">
                Preview ({preview.length} row{preview.length !== 1 ? 's' : ''})
              </h3>
              <button onClick={clearPreview} className="text-brown-lighter hover:text-brown p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto border border-warm-gray rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-warm-gray-light text-brown text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Author</th>
                    <th className="px-3 py-2 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Country</th>
                    <th className="px-3 py-2 font-medium">Language</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const missing = !row.title || !row.author;
                    const badType = row.type && !(BOOK_TYPES as readonly string[]).includes(row.type);
                    return (
                      <tr key={i} className={`border-t border-warm-gray ${missing || badType ? 'bg-red-50/50' : ''}`}>
                        <td className="px-3 py-2 text-brown-lighter">{i + 1}</td>
                        <td className={`px-3 py-2 ${!row.title ? 'text-red-500 italic' : 'text-brown'}`}>
                          {row.title || 'missing'}
                        </td>
                        <td className={`px-3 py-2 ${!row.author ? 'text-red-500 italic' : 'text-brown'}`}>
                          {row.author || 'missing'}
                        </td>
                        <td className="px-3 py-2 text-brown-light">{row.year}</td>
                        <td className="px-3 py-2 text-brown-light">{row.country}</td>
                        <td className="px-3 py-2 text-brown-light">{row.originalLanguage}</td>
                        <td className={`px-3 py-2 ${badType ? 'text-red-500' : 'text-brown-light'}`}>
                          {row.type}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {importing ? 'Importing...' : `Import ${preview.length} Book${preview.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
