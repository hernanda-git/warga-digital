"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LandingPageData } from "./landing-page-data";

interface LandingDataContextValue {
  /** Server data, or null while it is still streaming in. */
  data: LandingPageData | null;
  /** Called by the streamed bridge when the server data arrives. */
  publish: (data: LandingPageData) => void;
}

const LandingDataContext = createContext<LandingDataContextValue>({
  data: null,
  publish: () => {},
});

/**
 * Holds the landing page data.
 *
 * The provider is rendered by the page shell (sent to the browser
 * immediately), while the data itself is produced by a streamed server
 * component. The bridge inside that stream publishes the payload here.
 */
export function LandingDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LandingPageData | null>(null);

  const value = useMemo<LandingDataContextValue>(
    () => ({ data, publish: setData }),
    [data],
  );

  return (
    <LandingDataContext.Provider value={value}>
      {children}
    </LandingDataContext.Provider>
  );
}

export function useLandingData(): LandingDataContextValue {
  return useContext(LandingDataContext);
}
