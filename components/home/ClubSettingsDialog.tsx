"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { clubSettingsInput } from "@/lib/schemas";
import { saveClubSettings } from "@/lib/store";
import type { ClubSettings } from "@/lib/types";
import {
  btn,
  cx,
  errorNotice,
  field,
  fieldInput,
  fieldLabel,
  fieldRow,
  modalActions,
  spinner,
} from "@/lib/ui";

export function ClubSettingsDialog({
  settings,
  onClose,
  onSaved,
}: {
  settings: ClubSettings;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [schedule, setSchedule] = useState(settings.schedule);
  const [venue, setVenue] = useState(settings.venue);
  const [skillLevel, setSkillLevel] = useState(settings.skillLevel);
  const [whatsappUrl, setWhatsappUrl] = useState(settings.whatsappUrl ?? "");
  const [ayoUrl, setAyoUrl] = useState(settings.ayoUrl ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = clubSettingsInput.safeParse({
      schedule,
      venue,
      skillLevel,
      whatsappUrl,
      ayoUrl,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the club info fields");
      return;
    }

    setBusy(true);
    try {
      await saveClubSettings(parsed.data);
      onSaved("Club info updated");
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save club info",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Edit club info"
      description="Update the schedule, venue, skill level, and community links shown on the Home page."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className={fieldRow}>
          <label className={field}>
            <span className={fieldLabel}>Schedule</span>
            <input
              id="club-schedule"
              className={fieldInput}
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="Sundays, 08:00–11:00"
              maxLength={80}
              required
              autoFocus
            />
          </label>
          <label className={field}>
            <span className={fieldLabel}>Venue / Court</span>
            <input
              id="club-venue"
              className={fieldInput}
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="GOR Badminton ..."
              maxLength={100}
              required
            />
          </label>
        </div>

        <label className={field}>
          <span className={fieldLabel}>Skill level</span>
          <input
            id="club-skill-level"
            className={fieldInput}
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            placeholder="All levels, beginner to intermediate doubles"
            maxLength={120}
            required
          />
        </label>

        <label className={field}>
          <span className={fieldLabel}>WhatsApp group URL (optional)</span>
          <input
            id="club-whatsapp-url"
            type="url"
            className={fieldInput}
            value={whatsappUrl}
            onChange={(e) => setWhatsappUrl(e.target.value)}
            placeholder="https://chat.whatsapp.com/..."
            maxLength={300}
          />
        </label>

        <label className={field}>
          <span className={fieldLabel}>AYO community / join URL (optional)</span>
          <input
            id="club-ayo-url"
            type="url"
            className={fieldInput}
            value={ayoUrl}
            onChange={(e) => setAyoUrl(e.target.value)}
            placeholder="https://ayo.co.id/..."
            maxLength={300}
          />
        </label>

        {error && <div className={errorNotice}>{error}</div>}

        <div className={modalActions}>
          <button
            type="button"
            className={btn("light")}
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            id="save-club-settings"
            className={btn("primary")}
            disabled={busy}
          >
            {busy ? (
              <>
                <span className={cx(spinner, "mr-1.5")} />
                Saving…
              </>
            ) : (
              "Save club info"
            )}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
