"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Job, JobStatus, STATUS_LABELS, STATUS_COLUMN_COLORS } from "@/lib/types";
import { JobCard } from "./JobCard";

interface KanbanColumnProps {
  status: JobStatus;
  jobs: Job[];
  onAddJob: (status: JobStatus) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
}

export function KanbanColumn({
  status,
  jobs,
  onAddJob,
  onEditJob,
  onDeleteJob,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-[280px] w-[280px]">
      {/* Column header */}
      <div className={`bg-white rounded-xl border-t-4 border border-gray-100 ${STATUS_COLUMN_COLORS[status]} px-4 py-3 mb-2 flex items-center justify-between shadow-sm`}>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">{STATUS_LABELS[status]}</h3>
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {jobs.length}
          </span>
        </div>
        <button
          onClick={() => onAddJob(status)}
          className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title={`Add to ${STATUS_LABELS[status]}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors ${
          isOver ? "bg-blue-50" : "bg-gray-100/50"
        }`}
      >
        <SortableContext items={jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onEdit={onEditJob}
              onDelete={onDeleteJob}
            />
          ))}
        </SortableContext>

        {jobs.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400 text-center py-4">
              Drop cards here or<br />
              <button
                onClick={() => onAddJob(status)}
                className="text-blue-500 hover:text-blue-700 font-medium"
              >
                + add one
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
