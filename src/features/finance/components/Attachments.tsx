"use client";

// Comprovantes de uma conta ou de um lançamento (spec 12, fase C). Computador: arrastar ou
// clicar; celular: "Fotografar ou escolher" (o seletor nativo do aparelho oferece câmera e
// arquivos). Foto é reduzida no navegador (2000 px, JPEG 0,85) antes de subir. Excluir pede
// um segundo toque na lixeira: não tem volta.
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { attachFileAction, deleteFileAction, prepareUploadAction } from "../file-actions";
import { FILE_ACCEPT, FILES_BUCKET, fileProblem, MAX_FILES_PER_ITEM, type FileTarget, type FinanceFile } from "../files";
import styles from "../finance.module.css";

const MAX_SIDE = 2000;

// Reduz foto grande para JPEG. Se o navegador não decodifica (HEIC fora do Safari), sobe como veio.
async function shrink(file: File): Promise<{ blob: Blob; name: string; mime: string }> {
  const asIs = { blob: file as Blob, name: file.name, mime: file.type };
  if (!file.type.startsWith("image/")) return asIs;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return asIs;
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg", mime: "image/jpeg" };
  } catch {
    return asIs;
  }
}

export function Attachments({
  files,
  target,
  boleto,
  onChanged,
}: {
  files: FinanceFile[];
  target: FileTarget;
  boleto?: string | null; // linha digitável das observações, para "Copiar código"
  onChanged: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [isOver, setIsOver] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [preview, setPreview] = useState<FinanceFile | null>(null);
  const [copied, setCopied] = useState(false);
  const full = files.length >= MAX_FILES_PER_ITEM;

  const upload = async (list: FileList | null): Promise<void> => {
    const picked = Array.from(list ?? []).slice(0, MAX_FILES_PER_ITEM - files.length);
    if (picked.length === 0) return;
    setError("");
    setBusy(true);
    const supabase = createClient();
    for (const f of picked) {
      const { blob, name, mime } = await shrink(f);
      const meta = { name, mime, size: blob.size };
      const problem = fileProblem(mime, blob.size);
      if (problem) {
        setError(`${f.name}: ${problem}`);
        continue;
      }
      const prep = await prepareUploadAction(target, meta);
      if (!prep.success) {
        setError(prep.message);
        break;
      }
      const up = await supabase.storage.from(FILES_BUCKET).uploadToSignedUrl(prep.data.path, prep.data.token, blob, { contentType: mime });
      if (up.error) {
        setError("Não consegui enviar o arquivo. Tente de novo.");
        continue;
      }
      const res = await attachFileAction(target, prep.data.path, meta);
      if (!res.success) setError(res.message);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    onChanged();
  };

  const remove = async (id: string): Promise<void> => {
    if (armed !== id) {
      setArmed(id);
      return;
    }
    setArmed(null);
    setBusy(true);
    const res = await deleteFileAction(id);
    setBusy(false);
    if (!res.success) setError(res.message);
    onChanged();
  };

  const copy = async (code: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não consegui copiar. Selecione o código nas observações.");
    }
  };

  return (
    <section className={styles.files}>
      <div className={styles.filesHead}>Comprovantes</div>
      {files.length > 0 ? (
        <ul className={styles.fileList}>
          {files.map((f) => (
            <li key={f.id} className={styles.fileItem}>
              <button type="button" className={styles.fileOpen} onClick={() => setPreview(f)}>
                {f.mime.startsWith("image/") && f.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage, não passa pelo otimizador
                  <img className={styles.fileThumb} src={f.url} alt="" />
                ) : (
                  <span className={`${styles.fileThumb} ${styles.fileIcon}`}>
                    <FileText size={20} aria-hidden />
                  </span>
                )}
                <span className={styles.fileName}>{f.name}</span>
              </button>
              <button
                type="button"
                className={`${styles.fileDel}${armed === f.id ? ` ${styles.fileDelArmed}` : ""}`}
                aria-label={armed === f.id ? "Toque de novo para excluir" : `Excluir ${f.name}`}
                disabled={busy}
                onClick={() => void remove(f.id)}
                onBlur={() => setArmed((a) => (a === f.id ? null : a))}
              >
                {armed === f.id ? "Excluir?" : <Trash2 size={16} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {full ? (
        <div className={styles.hint}>Até {MAX_FILES_PER_ITEM} comprovantes por item.</div>
      ) : (
        <label
          className={`${styles.drop}${isOver ? ` ${styles.dropOver}` : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsOver(true);
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsOver(false);
            if (!busy) void upload(e.dataTransfer.files);
          }}
        >
          <input ref={input} type="file" accept={FILE_ACCEPT} multiple hidden disabled={busy} onChange={(e) => void upload(e.target.files)} />
          <Paperclip size={16} aria-hidden />
          {busy ? (
            <span>Enviando…</span>
          ) : (
            <>
              <span className={styles.dropDesk}>Arraste o arquivo ou clique para anexar</span>
              <span className={styles.dropTouch}>Fotografar ou escolher</span>
            </>
          )}
        </label>
      )}
      {error ? <div className="gerr">{error}</div> : null}

      {/* Portal: o painel pode estar com transform (arrasto no celular) e prenderia o fixed. */}
      {preview ? createPortal(
        <div className={styles.previewScrim} onClick={() => setPreview(null)} role="presentation">
          <div className={styles.preview} role="dialog" aria-label={preview.name} onClick={(e) => e.stopPropagation()}>
            {preview.mime.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage
              <img className={styles.previewMedia} src={preview.url} alt={preview.name} />
            ) : (
              <iframe className={styles.previewMedia} src={preview.url} title={preview.name} />
            )}
            <div className={styles.previewFoot}>
              <span className={styles.fileName}>{preview.name}</span>
              {boleto ? (
                <button type="button" className={`btn sm ${styles.press}`} onClick={() => void copy(boleto)}>
                  {copied ? "Copiado" : "Copiar código"}
                </button>
              ) : null}
              <a className="btn sm ghost" href={preview.url} target="_blank" rel="noreferrer">
                Abrir
              </a>
              <button type="button" className={`btn sm ghost ${styles.press}`} onClick={() => setPreview(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}
