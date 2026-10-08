import { redirect } from "next/navigation";

// Endereço antigo do recibo: mantém links já impressos/enviados funcionando.
export default async function OldReceiptPage({ params }: { params: Promise<{ id: string }> }): Promise<never> {
  const { id } = await params;
  redirect(`/finance/recibo/${id}`);
}
