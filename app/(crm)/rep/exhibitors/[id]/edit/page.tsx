import MobileExhibitorEditForm from "@/app/components/mobile/mobile-exhibitor-edit-form";

type RepExhibitorEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RepExhibitorEditPage({
  params,
}: RepExhibitorEditPageProps) {
  const { id } = await params;

  return (
    <main style={{ padding: 24, minHeight: "100%" }}>
      <div style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 14, color: "#64748b", fontWeight: 700 }}>
            Representante / Expositores / Editar
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: 28 }}>
            Editar informações do expositor
          </h1>
        </div>

        <MobileExhibitorEditForm exhibitorId={id} variant="rep" />
      </div>
    </main>
  );
}
