import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  if (token) {
    redirect(`/invite/${token}`);
  }
  redirect("/");
}
