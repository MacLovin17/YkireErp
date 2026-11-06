import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Download,
  FileDown,
  FileText,
  FileType,
  RefreshCw,
  ShieldCheck,
  ClipboardCheck,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';

const BASE = import.meta.env.BASE_URL;
const DOCS = {
  amostra_pdf: {
    label: 'Amostra reconstruída',
    title: 'Amostra em PDF · 4 páginas',
    filename: 'PGR_FAGUNDES_AMOSTRA_FIEL_EDITAVEL_015.pdf',
  },
  comparativo_pdf: {
    label: 'Comparação visual',
    title: 'Original × reconstrução',
    filename: 'PGR_FAGUNDES_COMPARATIVO_VISUAL_015.pdf',
  },
  referencia_pdf: {
    label: 'Documento original',
    title: 'PGR Fagundes original · 119 páginas',
    filename: 'PGR_FAGUNDES_ORIGINAL_119_PAGINAS.pdf',
  },
  amostra_word: {
    label: 'Word editável',
    title: 'Amostra de 4 páginas em Word',
    filename: 'PGR_FAGUNDES_AMOSTRA_FIEL_EDITAVEL_015.docx',
  },
};
async function fetchFile(key) {
  const p = new URLSearchParams({ route: 'pgr/homologacao/file', key });
  let res;
  try {
    res = await fetch(`${BASE}api/index.php?${p}`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept:
          'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/json',
      },
    });
  } catch {
    throw new Error('Não foi possível conectar à API PHP.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${res.status} ao acessar o arquivo.`);
  }
  const type = res.headers.get('Content-Type') || '';
  if (type.includes('application/json'))
    throw new Error('Servidor retornou JSON em vez do documento.');
  return res.blob();
}
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export default function PgrHomologacao() {
  const [info, setInfo] = useState(null),
    [loadingInfo, setLoadingInfo] = useState(true),
    [active, setActive] = useState('amostra_pdf');
  const [loadingPdf, setLoadingPdf] = useState(false),
    [pdfUrl, setPdfUrl] = useState(''),
    [error, setError] = useState(''),
    [downloading, setDownloading] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const pdfRef = useRef('');
  async function refreshInfo() {
    setLoadingInfo(true);
    try {
      const r = await fetch(`${BASE}api/index.php?route=pgr/homologacao/info`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await r
        .json()
        .catch(() => ({ error: 'Resposta inválida da API.' }));
      if (!r.ok) throw new Error(data.error || `Erro ${r.status}`);
      setInfo(data);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingInfo(false);
    }
  }
  useEffect(() => {
    refreshInfo();
  }, []);
  useEffect(() => {
    let cancelled = false;
    let temporary = '';
    setPdfUrl('');
    setLoadingPdf(true);
    setError('');
    fetchFile(active)
      .then((blob) => {
        if (cancelled) return;
        temporary = URL.createObjectURL(blob);
        pdfRef.current = temporary;
        setPdfUrl(temporary);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingPdf(false);
      });
    return () => {
      cancelled = true;
      if (temporary) URL.revokeObjectURL(temporary);
      if (pdfRef.current === temporary) pdfRef.current = '';
    };
  }, [active]);
  async function download(key) {
    setDownloading(key);
    setError('');
    try {
      const blob = await fetchFile(key);
      triggerDownload(blob, DOCS[key].filename);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading('');
    }
  }
  function downloadNotes() {
    if (!observacoes.trim()) {
      setError('Digite os apontamentos antes de exportar.');
      return;
    }
    setError('');
    const stamp = new Date().toLocaleString('pt-BR');
    const t = `YKIRE ERP — APONTAMENTOS DE HOMOLOGAÇÃO DO PGR\nModelo: PGR Fagundes 2025/2026 — Amostra 015 (4 páginas)\nRegistrado em: ${stamp}\n\n${observacoes.trim()}\n\nDocumento em homologação; nenhum PGR foi aprovado por este registro.\n`;
    triggerDownload(
      new Blob([t], { type: 'text/plain;charset=utf-8' }),
      'PGR_FAGUNDES_APONTAMENTOS_TST_015.txt',
    );
  }
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <PageHeader
          title="Homologação do PGR"
          subtitle="Modelo Fagundes · Amostra 015 · Conferência com o TST"
          icon={BookOpenCheck}
        />
        <Button variant="outline" onClick={refreshInfo} disabled={loadingInfo}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Conferir arquivos
        </Button>
      </div>
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <strong>MODELO EM HOMOLOGAÇÃO — NÃO É UM PGR APROVADO.</strong>
          <p className="mt-1">
            Esta amostra contém somente 4 páginas reconstruídas, correspondentes
            a páginas representativas do documento de 119 páginas. O gerador
            anterior (versão 014) ainda não reproduz integralmente o modelo
            Fagundes. Os arquivos desta tela são apenas para conferência visual
            e técnica.
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Documento de referência</p>
          <p className="font-bold text-slate-900 text-xl">119 páginas</p>
          <p className="text-xs text-slate-500">PGR Fagundes 2025–2026</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Amostra reconstruída</p>
          <p className="font-bold text-slate-900 text-xl">4 páginas</p>
          <p className="text-xs text-slate-500">
            Capa e páginas originais 5, 6 e 61
          </p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Situação</p>
          <p className="font-bold text-amber-700 text-lg">Aguardando análise</p>
          <p className="text-xs text-slate-500">
            Sem assinatura ou aprovação técnica
          </p>
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="p-4 border-b space-y-3">
          <div className="flex flex-wrap gap-2">
            {['amostra_pdf', 'comparativo_pdf', 'referencia_pdf'].map((key) => (
              <button
                type="button"
                key={key}
                onClick={() => setActive(key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${active === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {DOCS[key].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {DOCS[active].title}
              </p>
              <p className="text-xs text-slate-500">
                Prévia protegida por login do SSMA. A impressão do navegador não
                altera o documento.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!!downloading || !info?.files?.[active]?.available}
                onClick={() => download(active)}
                variant="outline"
              >
                <FileDown className="h-4 w-4 mr-2" />
                {downloading === active ? 'Baixando...' : 'Baixar PDF'}
              </Button>
              <Button
                disabled={
                  !!downloading || !info?.files?.amostra_word?.available
                }
                onClick={() => download('amostra_word')}
              >
                <FileType className="h-4 w-4 mr-2" />
                {downloading === 'amostra_word' ? 'Baixando...' : 'Baixar Word'}
              </Button>
            </div>
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}
        {loadingInfo && (
          <div className="p-4 text-sm text-slate-500">
            Verificando os arquivos privados...
          </div>
        )}
        <div className="bg-slate-100 p-2 sm:p-4 min-h-[450px]">
          {loadingPdf ? (
            <div className="h-[520px] flex items-center justify-center text-slate-500 text-sm">
              Carregando visualização protegida...
            </div>
          ) : pdfUrl ? (
            <iframe
              key={pdfUrl}
              title={DOCS[active].title}
              src={pdfUrl}
              className="w-full h-[min(76vh,900px)] min-h-[470px] bg-white border rounded-lg"
            />
          ) : (
            <div className="h-[520px] flex items-center justify-center text-slate-500 text-sm">
              Não foi possível abrir a prévia. Verifique a pasta privada do
              servidor.
            </div>
          )}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <div className="flex gap-2 items-center font-bold text-slate-800">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            Roteiro de avaliação do TST
          </div>
          <ul className="text-sm text-slate-700 space-y-2 list-disc pl-5">
            <li>Verificar a capa, logotipo e identificação da Proseg.</li>
            <li>
              Comparar cabeçalhos, rodapés, tabelas, fontes e espaçamentos.
            </li>
            <li>
              Conferir os textos, os dados contratuais e a fidelidade ao PGR
              Fagundes.
            </li>
            <li>
              Apontar os campos administrativos que poderão ser preenchidos
              automaticamente.
            </li>
            <li>
              Identificar o conteúdo que dependerá de revisão e aprovação do
              responsável técnico.
            </li>
          </ul>
        </div>
        <div className="rounded-xl border bg-white p-5 space-y-3">
          <h3 className="font-bold text-slate-800">
            Apontamentos para discussão
          </h3>
          <p className="text-xs text-slate-500">
            Escreva as observações do TST e baixe um arquivo de texto para
            compartilhar. Este campo não salva dados no servidor.
          </p>
          <textarea
            rows={6}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: Na página 5, aumentar a largura da coluna de identificação..."
            className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-y"
          />
          <Button variant="outline" onClick={downloadNotes}>
            <Download className="h-4 w-4 mr-2" />
            Baixar apontamentos .txt
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        A amostra ainda não foi aprovada nem integrada ao gerador de PGR. Não
        utilizar para apresentação formal como documento técnico assinado.
      </p>
    </div>
  );
}
