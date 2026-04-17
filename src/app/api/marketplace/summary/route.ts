import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";

export async function GET() {
  // Require authentication to access marketplace data
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  try {
    // Fetch domains
    const { data: domains, error: domainError } = await supabase
      .from("marketplace_domains")
      .select("id, code, name, icon")
      .eq("is_active", true)
      .order("sort_order");

    if (domainError) throw domainError;

    // Fetch categories
    const { data: categories, error: categoryError } = await supabase
      .from("marketplace_categories")
      .select("id, domain_id, name, description, icon")
      .eq("is_active", true)
      .order("sort_order");

    if (categoryError) throw categoryError;

    // Fetch items to calculate lowest price per category
    const { data: items, error: itemError } = await supabase
      .from("marketplace_items")
      .select("id, category_id, final_price, status");

    if (itemError) throw itemError;

    // Fetch jasa services for JASA domain
    const { data: jasaServices, error: jasaError } = await supabase
      .from("jasa_services")
      .select("id, category_id, estimated_price, is_available");

    if (jasaError) throw jasaError;

    // Process data
    const result = {
      UMKM: [] as any[],
      JASA: [] as any[],
    };

    domains?.forEach((domain) => {
      if (domain.code === "UMKM" || domain.code === "JASA") {
        const domainCategories =
          categories?.filter((c) => c.domain_id === domain.id) || [];

        domainCategories.forEach((category) => {
          // For UMKM domain, use marketplace_items
          if (domain.code === "UMKM") {
            const categoryItems =
              items?.filter(
                (item) =>
                  item.category_id === category.id && item.status === "ACTIVE",
              ) || [];

            let cheapest = null;
            if (categoryItems.length > 0) {
              cheapest = Math.min(...categoryItems.map((i) => i.final_price));
            }

            result[domain.code as "UMKM" | "JASA"].push({
              id: category.id,
              icon: category.icon,
              title: category.name,
              description: category.description,
              cheapest: cheapest,
              itemCount: categoryItems.length,
            });
          }
          // For JASA domain, use jasa_services
          else if (domain.code === "JASA") {
            const categoryServices =
              jasaServices?.filter(
                (service) =>
                  service.category_id === category.id &&
                  service.is_available === true,
              ) || [];

            let cheapest = null;
            if (categoryServices.length > 0) {
              cheapest = Math.min(
                ...categoryServices.map((s) => s.estimated_price),
              );
            }

            result[domain.code as "UMKM" | "JASA"].push({
              id: category.id,
              icon: category.icon,
              title: category.name,
              description: category.description,
              cheapest: cheapest,
              itemCount: categoryServices.length,
            });
          }
        });
      }
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
