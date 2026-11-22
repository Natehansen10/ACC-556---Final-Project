import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { Card, secondaryButtonClass } from "@/components/ui";
import { getCurrentMember, getSessionUser } from "@/lib/auth";

// Signed in, but no profile row yet (04_add_member.sql hasn't been run for them).
export default async function SetupPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (await getCurrentMember()) redirect("/");

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <h1 className="font-display text-[2rem] leading-[1.1] text-balance">Almost there</h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re signed in as <span className="font-medium text-foreground">{user.email}</span>,
          but you haven&apos;t been added to a family yet. Ask the family admin (Nate) to add you,
          then refresh this page.
        </p>
        <form action={signOut} className="mt-4">
          <button type="submit" className={secondaryButtonClass}>
            Sign out
          </button>
        </form>
      </Card>
    </div>
  );
}
