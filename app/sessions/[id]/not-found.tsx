import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-[480px] p-4 text-center">
      <Card className="p-8">
        <h2 className="font-display text-xl font-extrabold text-[#183e6b]">
          Session Not Found
        </h2>
        <p className="mt-2 mb-6 text-xs text-muted">
          This session may have been deleted or closed by an organiser.
        </p>
        <Link href="/">
          <Button variant="primary">Back to home</Button>
        </Link>
      </Card>
    </div>
  );
}

