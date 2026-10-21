"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KasRtPageData } from "./kas-rt-page-data";

interface KasRtDataContextValue {
  /** Server data, or null while it is still streaming in. */
  data: KasRtPageData | null;
  /** Called by the streamed bridge when the server data arrives. */
  publish: (data: KasRtPageData) => void;
}

const KasRtDataContext = createContext<KasRtDataContextValue>({
  data: null,
  publish: () => {},
});

/**
 * Holds the Kas RT page data.
 *
 * The provider is rendered by the page shell (which is sent to the browser
 * immediately), while the data itself is produced by a streamed server
 * component. The bridge inside that stream publishes the payload here.
 */
export function KasRtDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<KasRtPageData | null>(null);

  const value = useMemo<KasRtDataContextValue>(
    () => ({ data, publish: setData }),
    [data],
  );

  return (
    <KasRtDataContext.Provider value={value}>
      {children}
    </KasRtDataContext.Provider>
  );
}

export function useKasRtData(): KasRtDataContextValue {
  return useContext(KasRtDataContext);
}
