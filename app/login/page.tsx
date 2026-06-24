import { signIn } from "@/auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/groups");
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="font-display text-4xl font-700 text-pitch mb-3">
        Join the pool
      </h1>
      <p className="text-ink/70 mb-8">
        Sign in with Google to make your predictions. Only invited friends can
        join.
      </p>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/groups" });
        }}
      >
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-3 bg-white border border-line rounded-lg py-3 font-medium text-ink hover:bg-chalk transition shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.6 39.4 16.2 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.9 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
            />
          </svg>
          Sign in with Google
        </button>
      </form>

      <p className="text-xs text-ink/40 mt-6">
        If you sign in and get blocked, ask the pool admin to add your email
        to the invite list.
      </p>
    </div>
  );
}
