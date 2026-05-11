"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Job,
  JobStatus,
  ALL_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/types";
import { JobModal } from "@/components/jobs/JobModal";

type SortKey = "company" | "role" | "status" | "appliedDate" | "updatedAt";
type SortDir = "asc" | "desc";

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "ALL">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [modalJob, setModalJob] = useState<Job | null | undefined>(undefined);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    if (res.ok) setJobs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs
      .filter((j) => statusFilter === "ALL" || j.status === statusFilter)
      .filter((j) => {
        if (!q) return true;
        return (
          j.company.toLowerCase().includes(q) ||
          j.role.toLowerCase().includes(q) ||
          (j.notes?.toLowerCase().includes(q) ?? false) ||
          (j.jobUrl?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "company") cmp = a.company.localeCompare(b.company);
        else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
        else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        else if (sortKey === "appliedDate")
          cmp = new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
        else if (sortKey === "updatedAt")
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [jobs, search, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleStatusChange = async (job: Job, newStatus: JobStatus) => {
    setUpdatingId(job.id);
    // optimistic update
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
    );
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated: Job = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } else {
      // rollback
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
    }
    setUpdatingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const handleSaved = (saved: Job) => {
    setJobs((prev) => {
      const exists = prev.some((j) => j.id === saved.id);
      return exists
        ? prev.map((j) => (j.id === saved.id ? saved : j))
        : [saved, ...prev];
    });
    setModalJob(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} of {jobs.length} application{jobs.length !== 1 && "s"}
          </p>
        </div>
        <button
          onClick={() => setModalJob(null)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Application
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by company, role, or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JobStatus | "ALL")}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="ALL">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th onClick={() => toggleSort("company")} active={sortKey === "company"} dir={sortDir}>Company</Th>
                <Th onClick={() => toggleSort("role")} active={sortKey === "role"} dir={sortDir}>Role</Th>
                <Th onClick={() => toggleSort("status")} active={sortKey === "status"} dir={sortDir}>Status</Th>
                <Th onClick={() => toggleSort("appliedDate")} active={sortKey === "appliedDate"} dir={sortDir}>Applied</Th>
                <Th onClick={() => toggleSort("updatedAt")} active={sortKey === "updatedAt"} dir={sortDir}>Updated</Th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Notes</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    {jobs.length === 0
                      ? "No applications yet. Add your first one!"
                      : "No applications match your filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {job.jobUrl ? (
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 hover:underline"
                        >
                          {job.company}
                        </a>
                      ) : (
                        job.company
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{job.role}</td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={job.status}
                        loading={updatingId === job.id}
                        onChange={(s) => handleStatusChange(job, s)}
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {format(new Date(job.appliedDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {format(new Date(job.updatedAt), "MMM d")}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs">
                      <div className="truncate">{job.notes || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModalJob(job)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalJob !== undefined && (
        <JobModal
          job={modalJob}
          onClose={() => setModalJob(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
}) {
  return (
    <th className="px-4 py-3 text-left font-medium text-gray-500">
      <button
        onClick={onClick}
        className={`flex items-center gap-1 hover:text-gray-900 transition-colors ${
          active ? "text-gray-900" : ""
        }`}
      >
        {children}
        <span className="text-gray-400 text-xs">
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

function StatusSelect({
  value,
  loading,
  onChange,
}: {
  value: JobStatus;
  loading: boolean;
  onChange: (s: JobStatus) => void;
}) {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        disabled={loading}
        onChange={(e) => onChange(e.target.value as JobStatus)}
        className={`appearance-none pl-2.5 pr-7 py-1 rounded-md text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-opacity ${STATUS_COLORS[value]} ${loading ? "opacity-50" : ""}`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900">
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <svg
        className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
