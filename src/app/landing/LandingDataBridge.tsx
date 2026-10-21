"use client";

import { useEffect } from "react";
import { useLandingData } from "./landing-data-context";
import type { LandingPageData } from "./landing-page-data";

/**
 * Bridge between the streamed server payload and the landing page shell.
 *
 * It renders nothing: its only job is to hand the server data to the shell
 * as soon as the stream delivers it, so the page switches from placeholders
 * to real content without a second request.
 */
export function LandingDataBridge({ data }: { data: LandingPageData }) {
  const { publish } = useLandingData();

  useEffect(() => {
    publish(data);
  }, [data, publish]);

  return null;
}
