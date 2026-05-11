"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { DashboardStats, Job, JobStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { JobModal } from "@/components/jobs/JobModal";
import { SankeyChart } from "@/components/dashboard/SankeyChart";

const STAT_CONFIGS: { status: JobStatus; icon: string; gradient: string }[] = [
  { status: "APPLIED", icon: "📤", gradient: "from-blue-500 to-blue-600" },
  { status: "SCREENING", icon: "🔍", gradient: "from-yellow-500 to-orange-500" },
  { status: "INTERVIEW", icon: "🎯", gradient: "from-purple-500 to-purple-600" },
  { status: "OFFER", icon: "🎉", gradient: "from-green-500 to-emerald-600" },
  { status: "REJECTED", icon: "❌", gradient: "from-red-400 to-red-500" },
  { status: "GHOSTED", icon: "👻", gradient: "from-gray-400 to-gray-500" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    if (res.ok) {
      setStats(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSaved = (job: Job) => {
    void job;
    setShowModal(false);
    fetchStats();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Your job search at a glance</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Application
        </button>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-4">
        {/* Total */}
        <div className="col-span-2 sm:col-span-1 xl:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg">
          <p className="text-sm font-medium text-blue-100">Total Applications</p>
          <p className="text-5xl font-bold mt-2">{stats?.total ?? 0}</p>
          <Link
            href="/kanban"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-200 hover:text-white mt-3 transition-colors"
          >
            View board →
          </Link>
        </div>

        {/* Response rate */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Response Rate</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">{stats?.responseRate ?? 0}%</p>
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${stats?.responseRate ?? 0}%` }}
            />
          </div>
        </div>

        {/* Offers */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Offers</p>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {stats?.byStatus.OFFER ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {stats?.total
              ? `${Math.round(((stats.byStatus.OFFER ?? 0) / stats.total) * 100)}% offer rate`
              : "No applications yet"}
          </p>
        </div>
      </div>

      {/* Status breakdown */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-4">Status Breakdown</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {STAT_CONFIGS.map(({ status, icon, gradient }) => {
            const count = stats?.byStatus[status] ?? 0;
            const pct = stats?.total ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={status} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-base mb-3`}>
                  {icon}
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs font-medium text-gray-500 mt-0.5">{STATUS_LABELS[status]}</p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Application Flow (Sankey) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Application Flow</h2>
          <span className="text-xs text-gray-400">How applications move through your pipeline</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <SankeyChart />
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Recent Activity</h2>
          <Link href="/kanban" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all →
          </Link>
        </div>

        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {stats.recentActivity.map((job) => (
              <div key={job.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{job.company}</p>
                  <p className="text-xs text-gray-500 truncate">{job.role}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_COLORS[job.status as JobStatus]}`}>
                  {STATUS_LABELS[job.status as JobStatus]}
                </span>
                <span className="text-xs text-gray-400 w-16 text-right flex-shrink-0">
                  {format(new Date(job.appliedDate), "MMM d")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500 text-sm">No applications yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Add your first application →
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <JobModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
