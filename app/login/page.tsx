import { signIn } from "@/app/actions";
import { LoginForm } from "@/components/forms";
import { Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-6 sm:py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted text-pretty">
          Sign in to check in on your goals and see how the family is doing.
        </p>
      </div>
      <Card>
        <LoginForm action={signIn} />
      </Card>
      <p className="text-center text-sm text-muted text-pretty">
        There&apos;s no sign-up: the family admin makes each account. Ask Nate if you need one.
      </p>
    </div>
  );
}
