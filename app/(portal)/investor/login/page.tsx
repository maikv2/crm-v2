import { redirect } from "next/navigation";

type SearchParams = {
  redirect?: string;
  m?: string;
};

export default function InvestorLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = new URLSearchParams();

  params.set("access", "INVESTOR");

  if (searchParams?.redirect?.startsWith("/")) {
    params.set("redirect", searchParams.redirect);
  }

  if (searchParams?.m === "1") {
    params.set("m", "1");
  }

  redirect(`/login?${params.toString()}`);
}