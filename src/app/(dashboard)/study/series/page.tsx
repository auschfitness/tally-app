import { redirect } from "next/navigation";

// A lista de séries virou "Por série" na página Sermões.
export default function StudySeriesPage() {
  redirect("/study?ver=serie");
}
