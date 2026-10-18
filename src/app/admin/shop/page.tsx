import { Workspace } from "../Workspace";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Curated shop · Kahiye",
  robots: { index: false, follow: false },
};
export default function ShopAdminPage() {
  return <Workspace section="shop" />;
}
