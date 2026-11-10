"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto mt-16 max-w-[480px] p-4 text-center">
      <Card className="p-8">
        <h2 className="font-display text-xl font-extrabold text-[#183e6b]">
          Something went wrong
        </h2>
        <p className="mt-2 mb-6 text-xs text-muted">
          {error.message || "Failed to load session."}
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="light" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/">
            <Button variant="primary">Back to home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

