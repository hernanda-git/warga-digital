/**
 * House Status Page (Server Component)
 *
 * Fetches house payment status data server-side and delegates
 * rendering to the client component.
 */

import {
  requireAuth,
  fetchKasRtCommunityInfo,
  fetchKasRtPermissions,
  fetchKasRtHouseStatuses,
} from "../data";
import HouseStatusClient from "./HouseStatusClient";

export default async function HouseStatusPage() {
  const session = await requireAuth();

  const [communityName, permissions, statuses] = await Promise.all([
    fetchKasRtCommunityInfo(),
    fetchKasRtPermissions(session.userId),
    fetchKasRtHouseStatuses(),
  ]);

  return (
    <HouseStatusClient
      communityName={communityName}
      canView={permissions.canSubmitTransaction}
      initialStatuses={statuses}
    />
  );
}
