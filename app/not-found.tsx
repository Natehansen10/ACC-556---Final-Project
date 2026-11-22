import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <h1 className="font-display text-[2rem] leading-[1.1] text-balance">Not found</h1>
      <p className="mt-2 text-sm text-muted">That page doesn&apos;t exist.</p>
      <Link href="/" className={`${buttonClass} mt-6`}>
        Back to Today
      </Link>
    </div>
  );
}
