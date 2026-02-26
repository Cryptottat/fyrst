export default async function DeployerPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-text-primary mb-4">
          Deployer Profile
        </h1>
        <p className="text-lg text-text-secondary">
          Viewing deployer: {address}
        </p>
      </div>
    </main>
  );
}
