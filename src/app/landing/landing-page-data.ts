import type { HeaderProfile } from "@/types/landing";
import type { ResidentPostItem } from "@/components/landing/ResidentPostsSection";
import type { JualanGoodsWithMedia } from "@/types/jualan";
import type { JasaServiceWithMedia } from "@/types/database";

/**
 * Everything the landing page needs, in one bundle.
 *
 * It is produced on the server and streamed into the page shell, so the
 * header, the feature grid and the section frames are painted and usable
 * while the content is still on its way.
 */
export interface LandingPageData {
  headerProfile: HeaderProfile;
  articles: ResidentPostItem[];
  articlesError: string | null;
  jualanGoods: JualanGoodsWithMedia[];
  jasaServices: JasaServiceWithMedia[];
}
