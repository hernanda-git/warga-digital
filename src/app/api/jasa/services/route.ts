import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import type { JasaService, JasaSubService } from "@/types/database";

export interface JasaServiceWithSubs extends JasaService {
  sub_services: JasaSubService[];
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get("owner_user_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("jasa_services")
      .select("*, jasa_sub_services(*)")
      .order("created_at", { ascending: false });

    if (ownerId) {
      query = query.eq("owner_user_id", ownerId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse("Failed to fetch jasa services", 500, error.message);
    }

    return successResponse(data as JasaServiceWithSubs[]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("Failed to fetch jasa services", 500, message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const { service, subServices } = body as {
      service: Partial<JasaService>;
      subServices?: Partial<JasaSubService>[];
    };

    if (!service.name || !service.owner_user_id) {
      return errorResponse(
        "Validation failed: name and owner_user_id are required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { data: newService, error: serviceError } = await supabase
      .from("jasa_services")
      .insert(service)
      .select()
      .single();

    if (serviceError) {
      return errorResponse(
        "Failed to create jasa service",
        500,
        serviceError.message,
      );
    }

    let createdSubs: JasaSubService[] = [];
    if (subServices && subServices.length > 0) {
      const subsToInsert = subServices.map((sub) => ({
        ...sub,
        jasa_service_id: newService.id,
      }));

      const { data: subs, error: subsError } = await supabase
        .from("jasa_sub_services")
        .insert(subsToInsert)
        .select();

      if (subsError) {
        return errorResponse(
          "Failed to create sub-services",
          500,
          subsError.message,
        );
      }
      createdSubs = subs as JasaSubService[];
    }

    const result: JasaServiceWithSubs = {
      ...newService,
      sub_services: createdSubs,
    };

    return successResponse(result, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("Failed to create jasa service", 500, message);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await req.json();
    const { id, service, subServices } = body as {
      id: string;
      service: Partial<JasaService>;
      subServices?: Partial<JasaSubService>[];
    };

    if (!id) {
      return errorResponse(
        "Validation failed: id is required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { data: updatedService, error: serviceError } = await supabase
      .from("jasa_services")
      .update(service)
      .eq("id", id)
      .select()
      .single();

    if (serviceError) {
      return errorResponse(
        "Failed to update jasa service",
        500,
        serviceError.message,
      );
    }

    let updatedSubs: JasaSubService[] = [];
    if (subServices) {
      // Delete existing sub-services and re-insert
      await supabase
        .from("jasa_sub_services")
        .delete()
        .eq("jasa_service_id", id);

      if (subServices.length > 0) {
        const subsToInsert = subServices.map((sub) => ({
          ...sub,
          jasa_service_id: id,
        }));

        const { data: subs, error: subsError } = await supabase
          .from("jasa_sub_services")
          .insert(subsToInsert)
          .select();

        if (subsError) {
          return errorResponse(
            "Failed to update sub-services",
            500,
            subsError.message,
          );
        }
        updatedSubs = subs as JasaSubService[];
      }
    }

    const result: JasaServiceWithSubs = {
      ...updatedService,
      sub_services: updatedSubs,
    };

    return successResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("Failed to update jasa service", 500, message);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse(
        "Validation failed: id is required",
        400,
        "VALIDATION_ERROR",
      );
    }

    const { error } = await supabase
      .from("jasa_services")
      .delete()
      .eq("id", id);

    if (error) {
      return errorResponse("Failed to delete jasa service", 500, error.message);
    }

    return successResponse(null);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse("Failed to delete jasa service", 500, message);
  }
}
