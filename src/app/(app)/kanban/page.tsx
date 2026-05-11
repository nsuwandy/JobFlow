"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Job, JobStatus, ALL_STATUSES } from "@/lib/types";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { JobCard } from "@/components/kanban/JobCard";
import { JobModal } from "@/components/jobs/JobModal";

type BoardState = Record<JobStatus, Job[]>;

function buildBoard(jobs: Job[]): BoardState {
  const board = ALL_STATUSES.reduce((acc, s) => { acc[s] = []; return acc; }, {} as BoardState);
  for (const job of jobs) {
    board[job.status].push(job);
  }
  return board;
}

export default function KanbanPage() {
  const [board, setBoard] = useState<BoardState>(buildBoard([]));
  const [loading, setLoading] = useState(true);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [modalJob, setModalJob] = useState<Job | null | undefined>(undefined);
  const [defaultStatus, setDefaultStatus] = useState<JobStatus>("APPLIED");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Source column captured at drag start so we can detect cross-column moves
  // even after handleDragOver has optimistically moved the card.
  const sourceColRef = useRef<JobStatus | null>(null);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const jobs: Job[] = await res.json();
      setBoard(buildBoard(jobs));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const findColumn = (id: string): JobStatus | null => {
    if (ALL_STATUSES.includes(id as JobStatus)) return id as JobStatus;
    for (const status of ALL_STATUSES) {
      if (board[status].some((j) => j.id === id)) return status;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const col = findColumn(event.active.id as string);
    sourceColRef.current = col;
    if (col) {
      const job = board[col].find((j) => j.id === event.active.id);
      setActiveJob(job || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);
    if (!activeCol || !overCol || activeCol === overCol) return;

    setBoard((prev) => {
      const activeItems = [...prev[activeCol]];
      const overItems = [...prev[overCol]];
      const activeIndex = activeItems.findIndex((j) => j.id === active.id);
      const movedJob = { ...activeItems[activeIndex], status: overCol };

      activeItems.splice(activeIndex, 1);

      const overIndex = overItems.findIndex((j) => j.id === over.id);
      if (overIndex >= 0) {
        overItems.splice(overIndex, 0, movedJob);
      } else {
        overItems.push(movedJob);
      }

      return { ...prev, [activeCol]: activeItems, [overCol]: overItems };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const sourceCol = sourceColRef.current;
    sourceColRef.current = null;
    setActiveJob(null);
    if (!over || !sourceCol) return;

    // After dragOver, the card now lives in its destination column.
    const destCol = findColumn(active.id as string);
    if (!destCol) return;

    if (sourceCol === destCol) {
      // Reorder within the same column
      const items = board[destCol];
      const oldIndex = items.findIndex((j) => j.id === active.id);
      const newIndex = items.findIndex((j) => j.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        setBoard((prev) => ({
          ...prev,
          [destCol]: arrayMove(prev[destCol], oldIndex, newIndex),
        }));
      }
      return;
    }

    // Cross-column drop — persist the status change
    const res = await fetch(`/api/jobs/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: destCol }),
    });

    if (res.ok) {
      const updated: Job = await res.json();
      setBoard((prev) => ({
        ...prev,
        [destCol]: prev[destCol].map((j) => (j.id === updated.id ? updated : j)),
      }));
    } else {
      // Roll back: move card back to source column
      setBoard((prev) => {
        const card = prev[destCol].find((j) => j.id === active.id);
        if (!card) return prev;
        return {
          ...prev,
          [destCol]: prev[destCol].filter((j) => j.id !== active.id),
          [sourceCol]: [{ ...card, status: sourceCol }, ...prev[sourceCol]],
        };
      });
    }
  };

  const handleAddJob = (status: JobStatus) => {
    setDefaultStatus(status);
    setModalJob(null);
  };

  const handleEditJob = (job: Job) => {
    setModalJob(job);
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Delete this application?")) return;
    await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    setBoard((prev) => {
      const updated = { ...prev };
      for (const status of ALL_STATUSES) {
        updated[status] = updated[status].filter((j) => j.id !== id);
      }
      return updated;
    });
  };

  const handleSaved = (saved: Job) => {
    setBoard((prev) => {
      const updated = { ...prev };
      // Remove from all columns first
      for (const status of ALL_STATUSES) {
        updated[status] = updated[status].filter((j) => j.id !== saved.id);
      }
      // Add to correct column
      updated[saved.status] = [saved, ...updated[saved.status]];
      return updated;
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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
          <p className="text-sm text-gray-500 mt-1">Drag cards to update status</p>
        </div>
        <button
          onClick={() => handleAddJob("APPLIED")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Application
        </button>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6">
          {ALL_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              jobs={board[status]}
              onAddJob={handleAddJob}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
            />
          ))}
        </div>

        <DragOverlay>
          {activeJob && (
            <div className="rotate-2 opacity-90">
              <JobCard job={activeJob} onEdit={() => {}} onDelete={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modal */}
      {modalJob !== undefined && (
        <JobModal
          job={modalJob}
          defaultStatus={defaultStatus}
          onClose={() => setModalJob(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
