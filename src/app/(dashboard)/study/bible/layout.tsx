import type { ReactNode } from "react";
import { ReaderWorkspace } from "@/features/study/components/reader/ReaderWorkspace";

// A área de trabalho da leitura mora aqui para sobreviver à troca de capítulo (a página
// do capítulo remonta a cada navegação; o layout, não).
export default function BibleLayout({ children }: { children: ReactNode }): ReactNode {
  return <ReaderWorkspace>{children}</ReaderWorkspace>;
}
