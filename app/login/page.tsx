import { signIn } from "@/app/actions";
import { LoginForm } from "@/components/forms";
import { Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-muted">
          One family, one board. Set a health goal, check in each day, and cheer each other on.
        </p>
      </div>
      <Card>
        <LoginForm action={signIn} />
      </Card>
      <p className="text-center text-xs text-muted">
        Accounts are created by the family admin. Ask Nate if you need one.
      </p>
    </div>
  );
}
