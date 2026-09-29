export default async function IdeaPage({
  params,
}: {
  params: Promise<{ id: string; ideaId: string }>;
}) {
  const { id, ideaId } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-2 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Idea</h1>
      <p className="text-sm text-muted-foreground">
        Editor is added in M3. Brand {id}, idea {ideaId}.
      </p>
    </main>
  );
}
