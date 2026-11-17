"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { selectSession } from "@/lib/store";
import { AdminSessionContainer } from "./admin/AdminSessionContainer";
import { VisitorView } from "./VisitorView";
import { VisitorViewSkeleton } from "./VisitorViewSkeleton";

export default function SessionDetailApp() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const sessionId = params.id;

  useEffect(() => {
    if (sessionId) selectSession(sessionId);
  }, [sessionId]);

  function handleBackToSessions() {
    router.push("/sessions");
  }

  if (!sessionId || authLoading) {
    return <VisitorViewSkeleton onBackToList={handleBackToSessions} />;
  }

  if (user) {
    return (
      <AdminSessionContainer
        key={sessionId}
        sessionId={sessionId}
        user={user}
        onBackToList={handleBackToSessions}
      />
    );
  }

  return (
    <VisitorView
      key={sessionId}
      sessionId={sessionId}
      onBackToList={handleBackToSessions}
    />
  );
}
