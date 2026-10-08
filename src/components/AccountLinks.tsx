import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { logout } from "@/app/login/actions";

// Quiet site-wide account corner (bottom of the sidebar / inside the phone menu).
export async function AccountLinks() {
  const user = await currentUser();
  if (!user) return <Link href="/login" className="account-link">Log in</Link>;
  return (
    <span className="account">
      {user.role === "ADMIN" ? (
        <Link href="/admin" className="account-link">Admin</Link>
      ) : (
        user.handle && <Link href={`/wall/u/${user.handle}`} className="account-link">@{user.handle}</Link>
      )}
      <form action={logout}>
        <button className="account-link link-button">Log out</button>
      </form>
    </span>
  );
}
