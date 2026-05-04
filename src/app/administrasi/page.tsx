import { requireAuth, fetchCategories, fetchLetters, fetchNumberConfig } from "./data";
import { AdministrasiClient } from "./AdministrasiClient";

export default async function AdministrasiPage() {
  const session = await requireAuth();
  const [categories, letters, config] = await Promise.all([
    fetchCategories(),
    fetchLetters(session.userId),
    fetchNumberConfig(),
  ]);

  const communityName = `${config?.kelurahan ?? ""} RT ${config?.rt ?? ""}/${config?.rw ?? ""}`.trim() || "RT";

  return (
    <AdministrasiClient
      categories={categories}
      letters={letters}
      communityName={communityName}
      userId={session.userId}
    />
  );
}
