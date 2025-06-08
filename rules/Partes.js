// Mudar para a Aba de Informações
// Lista de Menus > índice 0 (primeiro), índice 1 (segundo item do menu), índice 0 = link => simula clique
document.querySelectorAll('.nav-tabs')[0].children[1].children[0].click();



// Extrair as informações que estão organizadas dentro de parágrafos e negritos, dentro da aba aberta
// Organização => <p><b>CAMPO</b>VALOR</p>
// Transformar em => {CAMPO: "VALOR"}
const dados = {};
document.querySelectorAll('jhi-documento-tab-details p').forEach(p => {
  const campo = p.querySelector('b')?.textContent?.replace(':', '').trim();
  let valor = p.textContent.replace(campo + ':', '').trim();

  if (p.querySelector('strong')) {
    valor = p.querySelector('strong').textContent.trim();
  }

  if (campo) dados[campo] = valor;
});
console.log(dados);


// 4. Criar botão customizado
const botaoCustom = document.createElement('button');
botaoCustom.innerText = '⏬ Download com nome';
botaoCustom.style.position = 'fixed';
botaoCustom.style.top = '20px';
botaoCustom.style.right = '20px';
botaoCustom.style.zIndex = 9999;
botaoCustom.style.background = '#007bff';
botaoCustom.style.color = 'white';
botaoCustom.style.border = 'none';
botaoCustom.style.padding = '10px 15px';
botaoCustom.style.borderRadius = '5px';
botaoCustom.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
botaoCustom.style.cursor = 'pointer';
document.body.appendChild(botaoCustom);

// 5. Lógica de clique no botão
botaoCustom.addEventListener('click', async () => {
  const nup = dados['NUP'] || 'sem-nup';
  const numero = dados['Número do Documento'] || 'sem-numero';
  const data = dados['Data']?.replace(/\//g, '-') || 'sem-data';
  const assunto = dados['Assunto']?.replace(/[\\/:*?"<>|]/g, '') || 'sem-assunto';

  const nomeArquivo = `${data} - ${nup} - ${numero} - ${assunto}.pdf`;

  // Procurar link de download do PDF (que termina com .pdf)
  const linkPDF = Array.from(document.querySelectorAll('a'))
    .map(a => a.href)
    .find(href => href.endsWith('.pdf'));

  if (!linkPDF) {
    alert('❌ Link para download do PDF não encontrado.');
    return;
  }

  // Requisição para obter o blob
  const resposta = await fetch(linkPDF);
  const blob = await resposta.blob();

  // Criar link temporário e forçar download com nome personalizado
  const linkTemp = document.createElement('a');
  linkTemp.href = URL.createObjectURL(blob);
  linkTemp.download = nomeArquivo;
  linkTemp.click();
  URL.revokeObjectURL(linkTemp.href);
});