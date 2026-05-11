"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { Job, STATUS_COLORS, STATUS_LABELS } from "@/lib/types";

interface JobCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
}

export function JobCard({ job, onEdit, onDelete }: JobCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-default select-none"
    >
      {/* Drag handle row */}
      <div
        {...attributes}
        {...listeners}
        className="px-4 pt-3 pb-1 cursor-grab active:cursor-grabbing flex items-start justify-between gap-2"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{job.company}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{job.role}</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mt-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${STATUS_COLORS[job.status]}`}>
            {STATUS_LABELS[job.status]}
          </span>
          <span className="text-xs text-gray-400">
            {format(new Date(job.appliedDate), "MMM d")}
          </span>
        </div>

        {job.notes && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{job.notes}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-50">
          {job.jobUrl && (
            <a
              href={job.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              View listing ↗
            </a>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => onEdit(job)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(job.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
