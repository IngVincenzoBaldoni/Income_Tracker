import { useState, useEffect } from 'react';
import { useJobs } from '@/hooks/useJobs';
import JobForm from '@/components/Jobs/JobForm';
import LoadingSpinner from '@/components/Common/LoadingSpinner';
import { formatCurrency, type Job } from '@/utils/calculations';

interface Props {
  onDataChange?: () => void;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Present';
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default function JobsList({ onDataChange }: Props) {
  const { jobs, loading, error, fetchJobs, createJob, updateJob, deleteJob } = useJobs();
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleCreate = async (payload: any) => {
    await createJob(payload);
    setShowForm(false);
    onDataChange?.();
  };

  const handleUpdate = async (payload: any) => {
    if (!editingJob) return;
    await updateJob(editingJob.id, payload);
    setEditingJob(null);
    onDataChange?.();
  };

  const handleDelete = async (jobId: string) => {
    setDeleting(true);
    try {
      await deleteJob(jobId);
      setDeleteConfirm(null);
      onDataChange?.();
    } finally {
      setDeleting(false);
    }
  };

  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-white font-semibold">Salary History</h3>
        {!showForm && !editingJob && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2 px-4">
            + Add entry
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 pb-6 border-b border-gray-700">
          <h4 className="text-white font-medium mb-4">New entry</h4>
          <JobForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/40 text-danger rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner className="py-8" />
      ) : sortedJobs.length === 0 ? (
        <div className="text-center py-10 text-muted">
          <p className="text-lg mb-2">No entries yet</p>
          <p className="text-sm">Add your first salary entry to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedJobs.map((job) => (
            <div key={job.id}>
              {editingJob?.id === job.id ? (
                <div className="bg-background-elevated rounded-lg p-4">
                  <h4 className="text-white font-medium mb-4">Edit entry</h4>
                  <JobForm job={editingJob} onSubmit={handleUpdate} onCancel={() => setEditingJob(null)} />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-background hover:bg-background-elevated transition-colors group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{job.jobTitle}</span>
                      <span className="text-accent text-sm">@ {job.company}</span>
                      {!job.endDate && (
                        <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">Current</span>
                      )}
                    </div>
                    <div className="text-muted text-sm mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{formatDate(job.startDate)} – {formatDate(job.endDate)}</span>
                      <span>{job.location}</span>
                    </div>
                    <div className="text-white font-semibold mt-1.5">
                      {formatCurrency(job.baseSalary, job.currency)}
                      {job.bonus > 0 && (
                        <span className="text-success text-sm font-normal ml-2">
                          +{formatCurrency(job.bonus, job.currency)} bonus
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingJob(job)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => setDeleteConfirm(job.id)} className="text-xs text-danger/70 hover:text-danger px-2 py-1 rounded hover:bg-danger/10 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {deleteConfirm === job.id && (
                <div className="mt-2 p-3 bg-danger/10 border border-danger/30 rounded-lg flex items-center justify-between gap-4">
                  <p className="text-sm text-danger">Delete <strong>{job.jobTitle} @ {job.company}</strong>?</p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                    <button onClick={() => setDeleteConfirm(null)} className="btn-secondary text-xs py-1.5 px-3">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
