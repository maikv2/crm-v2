import AiAssistant from "../components/ai-assistant";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AiAssistant />
    </>
  );
}
