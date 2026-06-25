import { signOutAction } from "@/app/actions/auth";

export default function SignOutForm() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-chalk/70 hover:text-amber transition-colors text-xs py-1"
      >
        Sign out
      </button>
    </form>
  );
}
