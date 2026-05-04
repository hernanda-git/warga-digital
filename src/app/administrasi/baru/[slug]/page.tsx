import { requireAuth } from "../../data";
import { FormAdministrasi } from "./FormAdministrasi";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdministrasiBaruPage({ params }: PageProps) {
  const session = await requireAuth();
  const { slug } = await params;

  return (
    <FormAdministrasi slug={slug} userId={session.userId} />
  );
}
