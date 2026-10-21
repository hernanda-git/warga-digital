/**
 * Landing data slot (Server Component)
 *
 * Loads everything the landing page needs and hands it to the page shell
 * through a streamed bridge. The shell is already on screen while this
 * runs, so the page never blocks on the database.
 */

import {
  fetchLandingProfile,
  fetchLandingArticles,
  fetchLandingJualan,
  fetchLandingJasa,
} from "./data";
import { LandingDataBridge } from "./LandingDataBridge";

export async function LandingDataSlot({ userId }: { userId: string }) {
  const [{ headerProfile }, { articles, error: articlesError }, jualanGoods, jasaServices] =
    await Promise.all([
      fetchLandingProfile(userId),
      fetchLandingArticles(),
      fetchLandingJualan(userId),
      fetchLandingJasa(userId),
    ]);

  return (
    <LandingDataBridge
      data={{
        headerProfile,
        articles,
        articlesError,
        jualanGoods,
        jasaServices,
      }}
    />
  );
}
