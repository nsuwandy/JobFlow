"use client";

import { useEffect, useState } from "react";

interface Settings {
  remindersEnabled: boolean;
  reminderDays: number;
  remindApplied: boolean;
  remindScreening: boolean;
  remindInterview: boolean;
}

const DEFAULTS: Settings = {
  remindersEnabled: true,
  reminderDays: 7,
  remindApplied: true,
  remindScreening: true,
  remindInterview: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setSettings(data);
        setLoading(false);
      });
  }, []);

  const update = async (patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }
      const updated = await res.json();
      setSettings(updated);
      setSavedAt(Date.now());
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const reminderDisabled = !settings.remindersEnabled;
  const noStatusesSelected =
    !settings.remindApplied && !settings.remindScreening && !settings.remindInterview;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your reminder preferences</p>
        </div>
        <div className="text-xs text-gray-400 h-5">
          {saving && "Saving…"}
          {!saving && savedAt && Date.now() - savedAt < 3000 && "Saved ✓"}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Master toggle */}
      <Card>
        <Row
          title="Email Reminders"
          description="Receive a daily email about applications that need a follow-up."
        >
          <Toggle
            checked={settings.remindersEnabled}
            onChange={(v) => update({ remindersEnabled: v })}
          />
        </Row>
      </Card>

      {/* Reminder configuration */}
      <Card disabled={reminderDisabled}>
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-gray-900">Reminder Rules</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure when and what triggers a reminder.
          </p>
        </div>

        <div className="divide-y divide-gray-100 mt-2">
          {/* Inactivity threshold */}
          <Row
            title="Inactivity threshold"
            description="Remind me when an application has had no update for this many days."
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={90}
                disabled={reminderDisabled}
                value={settings.reminderDays}
                onChange={(e) => {
                  const n = parseInt(e.target.value);
                  if (!Number.isNaN(n)) update({ reminderDays: n });
                }}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </Row>

          {/* Status checkboxes */}
          <div className="px-6 py-5">
            <p className="text-sm font-medium text-gray-900 mb-1">Remind me about these statuses</p>
            <p className="text-sm text-gray-500 mb-4">
              Only applications in selected statuses will trigger reminders.
            </p>

            <div className="space-y-2">
              <Checkbox
                checked={settings.remindApplied}
                disabled={reminderDisabled}
                onChange={(v) => update({ remindApplied: v })}
                label="Applied"
                color="bg-blue-100 text-blue-700 border-blue-200"
              />
              <Checkbox
                checked={settings.remindScreening}
                disabled={reminderDisabled}
                onChange={(v) => update({ remindScreening: v })}
                label="Screening"
                color="bg-yellow-100 text-yellow-700 border-yellow-200"
              />
              <Checkbox
                checked={settings.remindInterview}
                disabled={reminderDisabled}
                onChange={(v) => update({ remindInterview: v })}
                label="Interview"
                color="bg-purple-100 text-purple-700 border-purple-200"
              />
            </div>

            {!reminderDisabled && noStatusesSelected && (
              <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2">
                ⚠️ No statuses selected — you won&apos;t receive any reminders.
              </div>
            )}

            <p className="text-xs text-gray-400 mt-4">
              <strong>Offer</strong> and <strong>Rejected</strong> are never reminded about — those are terminal states.
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      {settings.remindersEnabled && !noStatusesSelected && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-900">
          📬 You&apos;ll receive a daily email about{" "}
          <strong>
            {[
              settings.remindApplied && "Applied",
              settings.remindScreening && "Screening",
              settings.remindInterview && "Interview",
            ]
              .filter(Boolean)
              .join(", ")}
          </strong>{" "}
          applications with no update in{" "}
          <strong>{settings.reminderDays} day{settings.reminderDays !== 1 && "s"}</strong>.
        </div>
      )}
    </div>
  );
}

function Card({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm transition-opacity ${
        disabled ? "opacity-60" : ""
      }`}
    >
      {children}
    </div>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Checkbox({
  checked,
  disabled,
  onChange,
  label,
  color,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
  color: string;
}) {
  return (
    <label
      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
        disabled
          ? "opacity-50 cursor-not-allowed border-gray-100"
          : checked
          ? "border-blue-200 bg-blue-50/40"
          : "border-gray-100 hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
      />
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}>
        {label}
      </span>
    </label>
  );
}
