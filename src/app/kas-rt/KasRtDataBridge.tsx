"use client";

import { useEffect } from "react";
import { useKasRtData } from "./kas-rt-data-context";
import type { KasRtPageData } from "./kas-rt-page-data";

/**
 * Bridge between the streamed server payload and the page shell.
 *
 * It renders nothing: its only job is to hand the server data to the shell
 * as soon as the stream delivers it, so the page switches from skeletons to
 * real content without a refetch.
 */
export function KasRtDataBridge({ data }: { data: KasRtPageData }) {
  const { publish } = useKasRtData();

  useEffect(() => {
    publish(data);
  }, [data, publish]);

  return null;
}
