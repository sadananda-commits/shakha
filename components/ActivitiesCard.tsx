import { useEffect, useState } from 'react';
import { callHssApi } from '@/lib/hssApi';
import {
  ActivityBook,
  ActivityDetailBundle,
  ActivityLogEntry,
  CommunityActivity,
  Participant,
} from '@/lib/types';

interface ActivitiesCardProps {
  userId: string;
  participants: Participant[];
}

export default function ActivitiesCard({ userId, participants }: ActivitiesCardProps) {
  const [statusFilter, setStatusFilter] = useState<'Ongoing' | 'Historical'>('Ongoing');
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingList(true);
    setSelectedId(null);
    callHssApi<CommunityActivity[]>('getActivityList', { status: statusFilter })
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setLoadingList(false));
  }, [statusFilter]);

  const selected = activities.find((a) => a['Activity ID'] === selectedId) || null;

  return (
    <div className="bg-paper-raised rounded-card border border-ink/10 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-marigold-dark">Activities</p>
          <h2 className="text-lg font-display font-semibold text-ink">Community Activities</h2>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'Ongoing' | 'Historical')}
          className="input w-auto"
        >
          <option value="Ongoing">Ongoing activities</option>
          <option value="Historical">Historical activities</option>
        </select>
      </div>

      {loadingList && <p className="text-ink-muted text-sm">Loading…</p>}

      {!loadingList && activities.length === 0 && (
        <p className="text-ink-muted text-sm">
          No {statusFilter.toLowerCase()} activities right now.
        </p>
      )}

      {!loadingList && activities.length > 0 && (
        <div className="flex flex-col gap-2">
          {activities.map((a) => {
            const isOpen = a['Activity ID'] === selectedId;
            return (
              <div key={a['Activity ID']} className="border border-ink/10 rounded-card overflow-hidden">
                <button
                  onClick={() => setSelectedId(isOpen ? null : a['Activity ID'])}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 bg-paper hover:bg-paper-raised transition-colors"
                >
                  <div>
                    <p className="font-display font-semibold text-ink">{a['Activity Name']}</p>
                    <p className="text-xs text-ink-muted font-mono mt-0.5">
                      {a['Start Date']} — {a['End Date']}
                    </p>
                  </div>
                  <span className="text-ink-light text-sm">{isOpen ? 'Hide' : 'View'}</span>
                </button>

                {isOpen && (
                  <div className="px-4 py-4 border-t border-ink/10 bg-paper">
                    <p className="text-sm text-ink-muted mb-4">{a['Description']}</p>
                    {a['Type'] === 'Reading Marathon' ? (
                      <ReadingMarathonRunTime
                        activityId={a['Activity ID']}
                        userId={userId}
                        participants={participants}
                      />
                    ) : (
                      <p className="text-sm text-ink-muted italic">
                        Logging isn't set up yet for this activity type.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReadingMarathonRunTime({
  activityId,
  userId,
  participants,
}: {
  activityId: string;
  userId: string;
  participants: Participant[];
}) {
  const [books, setBooks] = useState<ActivityBook[]>([]);
  const [myLog, setMyLog] = useState<ActivityLogEntry[]>([]);
  const [participantId, setParticipantId] = useState(participants[0]?.['Participant ID'] || '');
  const [bookId, setBookId] = useState('');
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [chapter, setChapter] = useState('');
  const [pagesRead, setPagesRead] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [addingBook, setAddingBook] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookPages, setNewBookPages] = useState('');

  function loadDetailAndLog() {
    callHssApi<ActivityDetailBundle>('getActivityDetail', { activityId }).then((d) => {
      setBooks(d.books);
      if (!bookId && d.books.length > 0) setBookId(d.books[0]['Book ID']);
    });
    callHssApi<ActivityLogEntry[]>('getMyActivityLog', { activityId, userId }).then(setMyLog);
  }

  useEffect(() => {
    loadDetailAndLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  async function handleAddBook() {
    if (!newBookName) return;
    const book = await callHssApi<ActivityBook>('addActivityBook', {
      activityId,
      userId,
      bookName: newBookName,
      author: newBookAuthor,
      totalPages: newBookPages,
    });
    setBooks((prev) => [...prev, book]);
    setBookId(book['Book ID']);
    setAddingBook(false);
    setNewBookName('');
    setNewBookAuthor('');
    setNewBookPages('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!participantId || !bookId || !pagesRead) {
      setError('Please select a participant, a book, and enter pages read.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await callHssApi('logActivityEntry', {
        activityId,
        userId,
        participantId,
        bookId,
        dateTime,
        chapter,
        pagesRead: Number(pagesRead),
      });
      setChapter('');
      setPagesRead('');
      loadDetailAndLog();
    } catch (err) {
      setError('Could not save that entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function participantName(id: string) {
    return participants.find((p) => p['Participant ID'] === id)?.['Participant Name'] || id;
  }
  function bookName(id: string) {
    return books.find((b) => b['Book ID'] === id)?.['Book Name'] || id;
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Who's reading</span>
          <select value={participantId} onChange={(e) => setParticipantId(e.target.value)} className="input">
            {participants.map((p) => (
              <option key={p['Participant ID']} value={p['Participant ID']}>
                {p['Participant Name']}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Date &amp; time</span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="input"
          />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-ink">Book</span>
          {!addingBook ? (
            <div className="flex gap-2">
              <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="input flex-1">
                {books.length === 0 && <option value="">No books yet</option>}
                {books.map((b) => (
                  <option key={b['Book ID']} value={b['Book ID']}>
                    {b['Book Name']} {b['Author'] ? `— ${b['Author']}` : ''}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setAddingBook(true)} className="btn-primary whitespace-nowrap">
                + Add book
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 bg-paper-raised rounded-card border border-ink/10 p-3">
              <input
                value={newBookName}
                onChange={(e) => setNewBookName(e.target.value)}
                placeholder="Book name"
                className="input"
              />
              <input
                value={newBookAuthor}
                onChange={(e) => setNewBookAuthor(e.target.value)}
                placeholder="Author (optional)"
                className="input"
              />
              <input
                value={newBookPages}
                onChange={(e) => setNewBookPages(e.target.value)}
                placeholder="Total pages (optional)"
                className="input"
              />
              <div className="flex gap-2">
                <button type="button" onClick={handleAddBook} className="btn-primary">
                  Save book
                </button>
                <button
                  type="button"
                  onClick={() => setAddingBook(false)}
                  className="text-sm text-ink-light underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Chapter (name or number)</span>
          <input value={chapter} onChange={(e) => setChapter(e.target.value)} className="input" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Pages read today</span>
          <input
            type="number"
            min={0}
            value={pagesRead}
            onChange={(e) => setPagesRead(e.target.value)}
            className="input"
          />
        </label>

        {error && <p className="text-sm text-vermilion sm:col-span-2">{error}</p>}

        <div className="sm:col-span-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Log today\'s reading'}
          </button>
        </div>
      </form>

      {myLog.length > 0 && (
        <div>
          <h3 className="text-sm font-display font-semibold text-ink mb-2">Your progress</h3>
          <div className="overflow-x-auto rounded-card border border-ink/10">
            <table className="w-full text-sm">
              <thead className="bg-paper-raised text-ink-muted text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Reader</th>
                  <th className="text-left px-3 py-2">Book</th>
                  <th className="text-left px-3 py-2">Chapter</th>
                  <th className="text-right px-3 py-2">Pages</th>
                </tr>
              </thead>
              <tbody>
                {myLog.map((l) => (
                  <tr key={l['Log ID']} className="border-t border-ink/10">
                    <td className="px-3 py-2 text-ink-light font-mono">{l['Date/Time']}</td>
                    <td className="px-3 py-2 text-ink">{participantName(l['Participant ID'])}</td>
                    <td className="px-3 py-2 text-ink-light">{bookName(l['Book ID'])}</td>
                    <td className="px-3 py-2 text-ink-light">{l['Chapter'] || '—'}</td>
                    <td className="px-3 py-2 text-right text-ink">{l['Pages Read']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
