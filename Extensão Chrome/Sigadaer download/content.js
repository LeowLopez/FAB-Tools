(() => {
  const normalizarTexto = texto => {
    return texto
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') //remove acentos
      .replace(/[^\w\s-]/g, '') //remove caracteres especiais
      //.replace(/\s+/g, '_') //espaços por _
      .replace(/\.(docx|xlsx|pptx?|pdf)$/i, '') //remove extensões
      .trim();
  };

  const formatarData = dataStr => {
    const partes = dataStr.split('/');
    if (partes.length === 3) {
      return `${partes[2]}${partes[1].padStart(2, '0')}${partes[0].padStart(2, '0')}`;
    }
    return dataStr;
  };

  async function baixarPdfRenomeado() {
    console.log('🚀 Iniciando processo de baixar PDF renomeado');

    // 1. Abre aba de informações
    const tab = document.querySelectorAll('.nav-tabs')[0]?.children[1]?.children[0];
    if (!tab) {
      console.error('❌ Aba "Informações" não encontrada');
      return;
    }
    tab.click();
    await new Promise(r => setTimeout(r, 1000));

    // 2. Extrai os metadados
    const dados = {};
    document.querySelectorAll('jhi-documento-tab-details p').forEach(p => {
      const campo = p.querySelector('b')?.textContent?.replace(':', '').trim();
      let valor = p.textContent.replace(campo + ':', '').trim();
      if (p.querySelector('strong')) valor = p.querySelector('strong').textContent.trim();
      if (campo) dados[campo] = valor;
    });

    const p1 = formatarData(dados['Data do Documento'] || '');
    const p2 = 'Of_' + normalizarTexto((dados['Número do Documento'] || '').replace(/\//g, ''));
    const p3 = normalizarTexto(dados['Órgão de Origem'] || dados['Local de Origem'] || '');
    const p4 = normalizarTexto(dados['Órgão de Destino'] || '');
    const p5 = normalizarTexto(dados['Assunto'] || '');
    const nomeArquivo = `${p1}_${p2}_${p3}-${p4}_${p5}.pdf`;

    console.log('📄 Nome do arquivo personalizado:', nomeArquivo);

    // 3. Tenta extrair URL do PDF ou clicar no botão de download
    const downloadBtn = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('Download')
    );
    if (!downloadBtn) {
      console.error('❌ Botão de download não encontrado!');
      return;
    }

    console.log('🖱️ Clicando no botão de download...');
    downloadBtn.click();

    // 4. Espera 2 segundos para garantir que o request aconteça e esteja em cache ou link seja criado
    await new Promise(r => setTimeout(r, 2000));

    // 5. Procura algum link <a> ou iframe que contenha .pdf
    let pdfUrl = null;

    const link = [...document.querySelectorAll('a')].find(a => a.href?.includes('.pdf'));
    if (link) pdfUrl = link.href;

    const iframe = [...document.querySelectorAll('iframe')].find(i => i.src?.includes('.pdf'));
    if (!pdfUrl && iframe) pdfUrl = iframe.src;

    console.log('🔎 URL do PDF encontrada:', pdfUrl);

    if (!pdfUrl) {
      console.error('❌ Não foi possível encontrar o link do PDF após o clique!');
      return;
    }

    // 6. Baixa com nome personalizado
    baixarComNomePersonalizado(pdfUrl, nomeArquivo);
  }

  function baixarComNomePersonalizado(url, nome) {
    console.log("📁 Iniciando download com nome:", nome);
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log('✅ Download finalizado como:', nome);
      })
      .catch(err => console.error('❌ Erro no fetch personalizado:', err));
  }

  // Listener para mensagem vinda do popup ou background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "baixar_pdf") {
      baixarPdfRenomeado();
    }
  });
})();
