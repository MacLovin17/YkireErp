import { jsPDF } from 'jspdf';

const money = n => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(Number(n) || 0);
const quantity = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits:3 }).format(Number(n) || 0);
const day = s => {
  if (!s) return '-';
  const date = new Date(String(s).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? String(s) : date.toLocaleDateString('pt-BR');
};
const text = s => String(s ?? '').trim() || '-';
const disposition = s => ({good:'Devolvida ao estoque',damaged:'Danificada (baixa)',lost:'Extraviada (baixa)'})[s] || text(s);

// Gera o PDF no navegador com o jsPDF, já presente nas dependências do projeto.
// Não armazena PDFs nem dados pessoais em um serviço externo.
export function generateEmployeeStatementPdf({ employee, epis = [], tools = [], returns = [], canViewFinancial = false }) {
  if (!employee?.registration) throw new Error('Dados incompletos do funcionário.');
  const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4', compress:true });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const left = 15, right = pw - 15, w = right-left;
  let y = 18;
  const ink = [15,23,42], muted = [100,116,139], accent = [79,70,229];
  const newPage = () => { pdf.addPage(); y = 20; };
  const ensure = h => { if (y+h > ph-24) newPage(); };
  const line = (value, x=left, size=10, bold=false, color=ink) => {
    pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text(value),pw-15-x);
    ensure(lines.length*(size*0.42+1.7)+3);
    pdf.text(lines,x,y); y += lines.length*(size*0.42+1.7);
  };
  const wrap = (value, width, size=9) => {
    pdf.setFontSize(size);
    return pdf.splitTextToSize(text(value),width);
  };
  const section = title => {
    ensure(15);
    pdf.setFillColor(238,242,255);pdf.roundedRect(left,y-2,w,9,2,2,'F');
    pdf.setTextColor(...accent);pdf.setFont('helvetica','bold');pdf.setFontSize(10);
    pdf.text(title,left+3,y+4); y += 13;
  };
  const paragraph = value => {
    const lines=wrap(value,w,9);ensure(lines.length*4.6+4);
    pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.setTextColor(...muted);
    pdf.text(lines,left,y); y += lines.length*4.6+4;
  };
  const rowsTable = (headers, records, widths) => {
    const head = () => {
      ensure(10);pdf.setFillColor(241,245,249);pdf.rect(left,y,w,8,'F');
      let x=left;pdf.setFont('helvetica','bold');pdf.setFontSize(8);pdf.setTextColor(...ink);
      headers.forEach((h,i)=>{pdf.text(h,x+2,y+5.5);x+=widths[i];}); y+=8;
    };
    head();
    if (!records.length) {ensure(9);line('Nenhum registro encontrado.',left+2,9,false,muted);y+=3;return;}
    for (const record of records) {
      pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);
      const cols=record.map((v,i)=>wrap(v,widths[i]-4,8.5));
      const height=Math.max(9,...cols.map(lines=>lines.length*4.15+4));
      if(y+height>ph-24){newPage();head();}
      let x=left; pdf.setDrawColor(226,232,240);pdf.line(left,y+height,left+w,y+height);
      pdf.setTextColor(...ink);
      cols.forEach((lines,i)=>{pdf.text(lines,x+2,y+5.5);x+=widths[i];}); y+=height;
    }
    y+=7;
  };

  pdf.setFillColor(15,23,42);pdf.rect(0,0,pw,34,'F');
  pdf.setFont('helvetica','bold');pdf.setFontSize(16);pdf.setTextColor(255,255,255);
  pdf.text('YKIRE ESTOQUE',left,16);
  pdf.setFont('helvetica','normal');pdf.setFontSize(10);
  pdf.text('Ficha individual de materiais e equipamentos',left,24);
  y=44;
  line(text(employee.full_name),left,14,true);
  line(`Matrícula: ${employee.registration}   |   Situação: ${employee.status==='active'?'Ativo':'Inativo'}`,left,9,false,muted);
  line(`Função: ${text(employee.job_title)}   |   Setor: ${text(employee.department)}`,left,9);
  line(`Unidade atual: ${text(employee.unit_name)}`,left,9);
  line(`Centro de custo: ${[employee.cost_center_code,employee.cost_center_name].filter(Boolean).join(' - ') || 'Não atribuído'}`,left,9);
  y+=4;
  const pending = tools.reduce((s,t)=>s+Number(t.outstanding_quantity||0),0);
  paragraph(`Resumo: ${epis.length} entrega(s) de EPI; ${tools.length} entrega(s) de ferramentas; ${quantity(pending)} unidade(s) em posse; ${returns.length} devolução(ões) e baixa(s).`);

  section('1. Entregas de EPI');
  rowsTable(canViewFinancial?['Data','EPI / CA','Qtd.','Almoxarifado','Valor']:['Data','EPI / CA','Qtd.','Almoxarifado'],epis.map(e=>[
    day(e.delivered_at), `${text(e.product_name)}\nCA: ${text(e.ca_number)}\nEntregue por: ${text(e.delivered_by)}${e.replacement_reason?'\nSubst.: '+e.replacement_reason:''}`,
    `${quantity(e.quantity)} ${text(e.product_unit)}`, `${text(e.warehouse_name)}\n${text(e.issue_unit_name)}`,...(canViewFinancial?[money(e.delivery_value)]:[])
  ]),canViewFinancial?[23,70,21,45,21]:[24,76,27,53]);
  section('2. Ferramentas entregues / pendentes');
  rowsTable(['Data','Ferramenta','Entregue','Em posse','Situação'],tools.map(t=>[
    day(t.issued_at), `${text(t.product_name)}\n${text(t.warehouse_name)}\nPor: ${text(t.issued_by)}`,`${quantity(t.issued_quantity)} ${text(t.product_unit)}`,
    quantity(t.outstanding_quantity), Number(t.outstanding_quantity)>0?'Em posse':'Encerrada'
  ]),[24,72,28,22,34]);
  section('3. Devoluções, danos e extravios');
  rowsTable(['Data','Ferramenta','Qtd.','Resultado / Responsável'],returns.map(r=>[
    day(r.occurred_at),text(r.product_name),quantity(r.quantity),
    `${disposition(r.disposition)}\nRecebido por: ${text(r.received_by)}${r.notes?'\nObs.: '+r.notes:''}`
  ]),[25,57,23,75]);
  paragraph('Documento administrativo gerado a partir dos registros do sistema. Não substitui a ficha de EPI assinada, recibo de entrega ou outras exigências legais.');

  const pages = pdf.getNumberOfPages();
  for (let i=1;i<=pages;i++) {
    pdf.setPage(i);pdf.setDrawColor(226,232,240);pdf.line(left,ph-17,pw-15,ph-17);
    pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(...muted);
    pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`,left,ph-11);
    pdf.text(`Página ${i} de ${pages}`,pw-15,ph-11,{align:'right'});
  }
  const safeReg=String(employee.registration).replace(/[^A-Za-z0-9_-]/g,'_');
  pdf.save(`Ykire_Ficha_Funcionario_${safeReg}.pdf`);
}
