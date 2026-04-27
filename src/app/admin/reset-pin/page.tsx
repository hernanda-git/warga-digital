import { redirect } from "next/navigation";

export default function AdminResetPinRedirect() {
  redirect("/admin/users");
}
