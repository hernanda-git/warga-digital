import { notFound } from "next/navigation";
import { requireAuth, fetchAssetById, fetchAssetLogs } from "../data";
import AssetDetailClient from "./AssetDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: Props) {
  await requireAuth();

  const { id } = await params;

  const [asset, logs] = await Promise.all([
    fetchAssetById(id),
    fetchAssetLogs(id),
  ]);

  if (!asset) notFound();

  return <AssetDetailClient asset={asset} initialLogs={logs} />;
}
