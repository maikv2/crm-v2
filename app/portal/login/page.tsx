import { redirect } from "next/navigation";

type SearchParams = {
  redirect?: string;
  m?: string;
};

export default function PortalLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = new URLSearchParams();

  params.set("access", "CLIENT");

  if (searchParams?.redirect?.startsWith("/")) {
    params.set("redirect", searchParams.redirect);
  } else {
    params.set("redirect", "/portal");
  }

  if (searchParams?.m === "1") {
    params.set("m", "1");
  }

  redirect(`/login?${params.toString()}`);
}