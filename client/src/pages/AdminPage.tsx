import { useState, useRef, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Shield, ShieldOff, Download, Upload, X, AlertCircle, CheckCircle, Trash2, UserPlus, Mail, Users, Image } from 'lucide-react';
import { BOOK_TYPES } from '@readingcircle/shared';
import type { UserResponse, InvitationResponse } from '@readingcircle/shared';
import { formatDate } from '@/lib/utils';

const CSV_HEADERS = ['title', 'author', 'year', 'country', 'originalLanguage', 'type', 'introduction'] as const;
const MEET_CSV_HEADERS = ['sequence', 'host', 'book'] as const;

interface ParsedRow {
  title: string;
  author: string;
  year: string;
  country: string;
  originalLanguage: string;
  type: string;
  introduction: string;
}

interface ParsedMeetRow {
  sequence: string;
  host: string;
  book: string;
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

function parseMeetCSV(text: string): ParsedMeetRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0]!;
  const header = headerLine.split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
  const headerMap = new Map(header.map((h, i) => [h.toLowerCase(), i]));

  const getIndex = (name: string) => headerMap.get(name.toLowerCase()) ?? -1;

  const rows: ParsedMeetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]!);
    rows.push({
      sequence: values[getIndex('sequence')] || '',
      host: values[getIndex('host')] || '',
      book: values[getIndex('book')] || '',
    });
  }
  return rows;
}

export function AdminPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileError, setFileError] = useState('');

  // Export backup state
  const [exporting, setExporting] = useState(false);

  // Cover fetch state
  const [fetchingCovers, setFetchingCovers] = useState(false);
  const [coverResult, setCoverResult] = useState<{ total: number; updated: number } | null>(null);

  // Meets import state
  const meetFileInputRef = useRef<HTMLInputElement>(null);
  const [meetPreview, setMeetPreview] = useState<ParsedMeetRow[]>([]);
  const [meetImporting, setMeetImporting] = useState(false);
  const [meetResult, setMeetResult] = useState<ImportResult | null>(null);
  const [meetFileError, setMeetFileError] = useState('');

  // Member management state
  const [members, setMembers] = useState<UserResponse[]>([]);
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [membersError, setMembersError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [membersData, invData] = await Promise.all([
          api<UserResponse[]>('/users'),
          api<InvitationResponse[]>('/invitations'),
        ]);
        if (!cancelled) {
          setMembers(membersData);
          setInvitations(invData);
        }
      } catch {
        if (!cancelled) setMembersError(true);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function loadMembers() {
    try {
      const [membersData, invData] = await Promise.all([
        api<UserResponse[]>('/users'),
        api<InvitationResponse[]>('/invitations'),
      ]);
      setMembers(membersData);
      setInvitations(invData);
    } catch {
      // ignore
    } finally {
      setMembersLoading(false);
    }
  }

  const toggleAdmin = async (memberId: string) => {
    try {
      await api(`/users/${memberId}/admin`, { method: 'PATCH' });
      loadMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const removeMember = async (memberId: string, username: string) => {
    if (!confirm(t('admin.confirmRemove', { name: username }))) return;
    try {
      await api(`/users/${memberId}`, { method: 'DELETE' });
      loadMembers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  };

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      await api('/invitations', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail }),
      });
      setInviteEmail('');
      setShowInvite(false);
      loadMembers();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

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
        setFileError(t('admin.noDataRows'));
        setPreview([]);
        return;
      }
      const valid = rows.filter(r => r.title && r.author);
      if (valid.length === 0) {
        setFileError(t('admin.noValidRows'));
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

  const downloadMeetTemplate = () => {
    const content = MEET_CSV_HEADERS.join(',') + '\n';
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meets_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMeetFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMeetFileError('');
    setMeetResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseMeetCSV(text);
      if (rows.length === 0) {
        setMeetFileError(t('admin.noDataRows'));
        setMeetPreview([]);
        return;
      }
      const valid = rows.filter(r => r.sequence && r.host && r.book);
      if (valid.length === 0) {
        setMeetFileError(t('admin.meetsNoValidRows'));
        setMeetPreview([]);
        return;
      }
      setMeetPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleMeetImport = async () => {
    if (meetPreview.length === 0) return;
    setMeetImporting(true);
    setMeetResult(null);
    try {
      const data = await api<ImportResult>('/meets/import', {
        method: 'POST',
        body: JSON.stringify({ meets: meetPreview }),
      });
      setMeetResult(data);
      setMeetPreview([]);
      if (meetFileInputRef.current) meetFileInputRef.current.value = '';
    } catch (err: unknown) {
      setMeetFileError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setMeetImporting(false);
    }
  };

  const clearMeetPreview = () => {
    setMeetPreview([]);
    setMeetFileError('');
    setMeetResult(null);
    if (meetFileInputRef.current) meetFileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-serif font-bold text-burgundy flex items-center gap-3">
        <Shield className="w-8 h-8" />
        {t('admin.title')}
      </h1>

      {/* Bulk Import Section */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg">{t('admin.bulkImport')}</h2>
        <p className="text-sm text-brown-light">
          {t('admin.bulkImportDesc', { types: BOOK_TYPES.join(', ') })}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-warm-gray text-brown hover:bg-warm-gray-light rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            {t('admin.downloadTemplate')}
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />
            {t('admin.selectCsvFile')}
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
              {t('admin.imported', { count: result.imported })}
            </div>
            {result.errors.length > 0 && (
              <div className="text-brown-light mt-2">
                <p className="font-medium text-brown">{t('admin.skipped', { count: result.errors.length })}</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {result.errors.map((err, i) => (
                    <li key={i}>{t('admin.rowError', { row: err.row, error: err.error })}</li>
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
                {t('admin.preview', { count: preview.length })}
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
                    <th className="px-3 py-2 font-medium">{t('admin.title_column')}</th>
                    <th className="px-3 py-2 font-medium">{t('admin.author_column')}</th>
                    <th className="px-3 py-2 font-medium">{t('admin.year_column')}</th>
                    <th className="px-3 py-2 font-medium">{t('admin.country_column')}</th>
                    <th className="px-3 py-2 font-medium">{t('admin.language_column')}</th>
                    <th className="px-3 py-2 font-medium">{t('admin.type_column')}</th>
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
                          {row.title || t('admin.missing')}
                        </td>
                        <td className={`px-3 py-2 ${!row.author ? 'text-red-500 italic' : 'text-brown'}`}>
                          {row.author || t('admin.missing')}
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
              {importing ? t('admin.importing') : t('admin.importBooks', { count: preview.length })}
            </button>
          </div>
        )}
      </div>

      {/* Import Historical Meets Section */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg">{t('admin.meetsImport')}</h2>
        <p className="text-sm text-brown-light">
          {t('admin.meetsImportDesc')}
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadMeetTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-warm-gray text-brown hover:bg-warm-gray-light rounded-lg transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            {t('admin.downloadTemplate')}
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />
            {t('admin.selectCsvFile')}
            <input
              ref={meetFileInputRef}
              type="file"
              accept=".csv"
              onChange={handleMeetFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {meetFileError && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {meetFileError}
          </div>
        )}

        {meetResult && (
          <div className="bg-sage/10 border border-sage/30 px-4 py-3 rounded-lg text-sm space-y-1">
            <div className="flex items-center gap-2 text-sage-dark font-medium">
              <CheckCircle className="w-4 h-4" />
              {t('admin.meetsImported', { count: meetResult.imported })}
            </div>
            {meetResult.errors.length > 0 && (
              <div className="text-brown-light mt-2">
                <p className="font-medium text-brown">{t('admin.skipped', { count: meetResult.errors.length })}</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  {meetResult.errors.map((err, i) => (
                    <li key={i}>{t('admin.rowError', { row: err.row, error: err.error })}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Meet Preview table */}
        {meetPreview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-brown">
                {t('admin.preview', { count: meetPreview.length })}
              </h3>
              <button onClick={clearMeetPreview} className="text-brown-lighter hover:text-brown p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-x-auto border border-warm-gray rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-warm-gray-light text-brown text-left">
                    <th className="px-3 py-2 font-medium">{t('admin.meetSequence_column')}</th>
                    <th className="px-3 py-2 font-medium">{t('admin.meetHost_column')}</th>
                    <th className="px-3 py-2 font-medium">{t('admin.meetBook_column')}</th>
                  </tr>
                </thead>
                <tbody>
                  {meetPreview.map((row, i) => {
                    const missing = !row.sequence || !row.host || !row.book;
                    return (
                      <tr key={i} className={`border-t border-warm-gray ${missing ? 'bg-red-50/50' : ''}`}>
                        <td className={`px-3 py-2 ${!row.sequence ? 'text-red-500 italic' : 'text-brown-lighter'}`}>
                          {row.sequence || t('admin.missing')}
                        </td>
                        <td className={`px-3 py-2 ${!row.host ? 'text-red-500 italic' : 'text-brown'}`}>
                          {row.host || t('admin.missing')}
                        </td>
                        <td className={`px-3 py-2 ${!row.book ? 'text-red-500 italic' : 'text-brown'}`}>
                          {row.book || t('admin.missing')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleMeetImport}
              disabled={meetImporting}
              className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {meetImporting ? t('admin.importing') : t('admin.importMeets', { count: meetPreview.length })}
            </button>
          </div>
        )}
      </div>

      {/* Export Backup Section */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg">{t('admin.exportBackup')}</h2>
        <p className="text-sm text-brown-light">{t('admin.exportBackupDesc')}</p>
        <button
          onClick={async () => {
            setExporting(true);
            try {
              const data = await api('/export');
              const json = JSON.stringify(data, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `readingcircle-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (err: unknown) {
              alert(err instanceof Error ? err.message : 'Export failed');
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? t('admin.exporting') : t('admin.exportButton')}
        </button>
      </div>

      {/* Fetch Book Covers Section */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <h2 className="font-serif font-semibold text-brown text-lg">{t('admin.fetchCovers')}</h2>
        <p className="text-sm text-brown-light">{t('admin.fetchCoversDesc')}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={async () => {
              setFetchingCovers(true);
              setCoverResult(null);
              try {
                const data = await api<{ total: number; updated: number }>('/books/backfill-covers', { method: 'POST' });
                setCoverResult(data);
              } catch (err: unknown) {
                setCoverResult(null);
                alert(err instanceof Error ? err.message : 'Failed');
              } finally {
                setFetchingCovers(false);
              }
            }}
            disabled={fetchingCovers}
            className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Image className="w-4 h-4" />
            {fetchingCovers ? t('admin.fetchingCovers') : t('admin.fetchCovers')}
          </button>
          {coverResult && (
            <span className="text-sm text-sage-dark font-medium">
              {t('admin.coversResult', { updated: coverResult.updated, total: coverResult.total })}
            </span>
          )}
        </div>
      </div>

      {/* Member Management Section */}
      <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-semibold text-brown text-lg">{t('admin.memberManagement')}</h2>
          <button onClick={() => setShowInvite(!showInvite)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg transition-colors text-sm font-medium">
            <UserPlus className="w-4 h-4" />
            {t('admin.inviteMember')}
          </button>
        </div>

        {showInvite && (
          <form onSubmit={sendInvite} className="bg-cream/50 rounded-lg border border-warm-gray p-4 space-y-3">
            <h3 className="font-medium text-brown text-sm">{t('admin.inviteNewMember')}</h3>
            {inviteError && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{inviteError}</div>}
            <div className="flex gap-3">
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required
                placeholder="friend@example.com"
                className="flex-1 px-4 py-2.5 rounded-lg border border-warm-gray bg-white text-brown focus:outline-none focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy transition text-sm" />
              <button type="submit" disabled={inviting}
                className="px-4 py-2 bg-burgundy hover:bg-burgundy-light text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {inviting ? t('auth.forgot.sending') : t('common.send')}
              </button>
              <button type="button" onClick={() => setShowInvite(false)}
                className="px-4 py-2 text-brown hover:bg-warm-gray-light rounded-lg text-sm">{t('common.cancel')}</button>
            </div>
          </form>
        )}

        {membersLoading ? (
          <div className="text-brown-light animate-pulse text-sm">{t('admin.loadingMembers')}</div>
        ) : membersError ? (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">{t('common.loadError')}</div>
        ) : (
          <div className="divide-y divide-warm-gray-light">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-burgundy/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-burgundy" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-brown text-sm">{m.username}</span>
                      {m.isAdmin && (
                        <span title={t('common.admin')}><Shield className="w-3.5 h-3.5 text-burgundy" /></span>
                      )}
                      {m.id === user?.id && (
                        <span className="text-xs text-brown-lighter">{t('common.you')}</span>
                      )}
                    </div>
                    <p className="text-xs text-brown-light">{m.email}</p>
                  </div>
                </div>

                {m.id !== user?.id && (
                  <div className="flex gap-1">
                    <button onClick={() => toggleAdmin(m.id)} title={m.isAdmin ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                      aria-label={m.isAdmin ? t('admin.removeAdmin') : t('admin.makeAdmin')}
                      className="p-2 text-brown-light hover:bg-warm-gray-light rounded-lg transition-colors">
                      {m.isAdmin ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    </button>
                    <button onClick={() => removeMember(m.id, m.username)} title={t('admin.removeFromCircle')}
                      aria-label={t('admin.removeFromCircle')}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sent Invitations Section */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-xl border border-warm-gray p-6 space-y-4">
          <h2 className="font-serif font-semibold text-brown text-lg">{t('admin.sentInvitations')}</h2>
          <div className="divide-y divide-warm-gray-light">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-brown-lighter" />
                  <div>
                    <span className="text-sm font-medium text-brown">{inv.email}</span>
                    <p className="text-xs text-brown-lighter">
                      {t('admin.invitedByOn', { name: inv.invitedByUsername, date: formatDate(inv.createdAt) })}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full ${inv.used ? 'bg-sage/20 text-sage-dark' : 'bg-warm-gray text-brown-light'}`}>
                  {inv.used ? t('admin.accepted') : t('admin.pending')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
