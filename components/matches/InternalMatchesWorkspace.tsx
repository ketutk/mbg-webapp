"use client";

import type { AuthUser } from "@/lib/types";
import { AdminSessionContainer } from "./admin/AdminSessionContainer";
import { SessionsDirectory } from "./admin/SessionsDirectory";

export function InternalMatchesWorkspace({
  user,
  currentSessionId,
  onSelectSession,
  onToast,
}: {
  user: AuthUser;
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onToast: (msg: string) => void;
}) {
  return (
    <>
      {currentSessionId && (
        <div className="mb-8">
          <AdminSessionContainer
            key={currentSessionId}
            sessionId={currentSessionId}
            user={user}
            onToast={onToast}
          />
        </div>
      )}

      <SessionsDirectory
        user={user}
        currentSessionId={currentSessionId}
        onSelectSession={onSelectSession}
        onToast={onToast}
      />
    </>
  );
}
