export default async function TokenDetailPage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = await params;

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Token Detail
        </h1>
        <p className="text-lg text-text-secondary">
          Viewing token: {mint}
        </p>
      </div>
    </main>
  );
}
