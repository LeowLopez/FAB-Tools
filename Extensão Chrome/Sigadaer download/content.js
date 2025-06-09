(() => {

  const normalizarTexto = texto => {
    return texto
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') //remove acentos
      .replace(/[^\w\s-]/g, '') //remove caracteres especiais
      //.replace(/\s+/g, '_') //espaços por _
      .replace(/\.(docx|xlsx|pptx?|pdf)$/i, '') //remove extensões
      .trim();
  };

  const formatarData = dataStr => {//devolve no formato AAAAMMDD
    const partes = dataStr.split('/');
    if (partes.length === 3) {
      return `${partes[2]}${partes[1].padStart(2, '0')}${partes[0].padStart(2, '0')}`;
    }
    return dataStr;
  };

  const baixarPdfRenomeado = async (modelo) => {
    if (!modelo) modelo = 'oficio';

    enviarLog('info', `Iniciando processo de baixar PDF renomeado para o modelo: ${modelo}`);

    // 1. Abre aba de informações
    // Lista de Menus > índice 0 (primeiro), índice 1 (segundo item do menu), índice 0 = link => simula clique
    const tab = document.querySelectorAll('.nav-tabs')[0]?.children[1]?.children[0];
    if (!tab) {
      enviarLog('erro', 'Aba "Informações" não encontrada');
      return;
    }
    tab.click();
    await new Promise(r => setTimeout(r, 1000));

    // 2. Extrai os metadados que estão organizados dentro de parágrafos e negritos, dentro da aba aberta
    // Organização => <p><b>CAMPO</b>VALOR</p>
    // Transformar em => dados = {CAMPO1: "VALOR1", CAMPO2: "VALOR2", ...}, então dados['CAMPO_NOME'] = valor_campo
    const dados = {};
    document.querySelectorAll('jhi-documento-tab-details p').forEach(p => {
      const campo = p.querySelector('b')?.textContent?.replace(':', '').trim();
      let valor = p.textContent.replace(campo + ':', '').trim();
      if (p.querySelector('strong')) valor = p.querySelector('strong').textContent.trim();
      if (campo) dados[campo] = valor;
    });

    // 3. Monta o nome do arquivo
    let p1, p2, p3, p4, p5, nomeArquivo;

    if (modelo === 'oficio') {//Se não for passado modelo, o padrão é ofício, então usa esse
      // Implementar um select (no popup.js) para outros modelos para definir outros modos de montar esse nome
      p1 = formatarData(dados['Data do Documento'] || '');
      p2 = 'Of_' + normalizarTexto((dados['Número do Documento'] || '').replace(/\//g, ''));
      p3 = normalizarTexto(dados['Órgão de Origem'] || dados['Local de Origem'] || '');
      p4 = normalizarTexto(dados['Órgão de Destino'] || '');
      p5 = normalizarTexto(dados['Assunto'] || '');
      nomeArquivo = `${p1}_${p2}_${p3}-${p4}_${p5}.pdf`;
    }

    if (!nomeArquivo) return enviarLog('erro', 'Nome de arquivo não definido para esse modelo.');

    enviarLog('info', `Nome do arquivo personalizado: ${nomeArquivo}`);

    // 4. Tenta extrair URL do PDF ou clicar no botão de download
    const downloadBtn = Array.from(document.querySelectorAll('button')).find(btn =>
      btn.textContent.includes('Download')
    );
    if (!downloadBtn) {
      enviarLog('erro', 'Botão de download não encontrado!');
      return;
    }

    enviarLog('info', 'Clicando no botão de download...');
    downloadBtn.click();

    // 5. Espera 2 segundos para garantir que o request aconteça e esteja em cache ou link seja criado
    await new Promise(r => setTimeout(r, 2000));

    let pdfUrl = null;

    // Tenta pegar de <a>
    const link = [...document.querySelectorAll('a')].find(a => a.href?.includes('.pdf'));
    if (link) pdfUrl = link.href;
    
    // Tenta pegar de <iframe>
    const iframe = [...document.querySelectorAll('iframe')].find(i => i.src?.includes('.pdf'));
    if (!pdfUrl && iframe) pdfUrl = iframe.src;
    console.log(document.querySelectorAll('iframe'));

    // Se for uma URL do viewer do PDF.js, extrair o link real da query ?file=
    if (pdfUrl?.includes('viewer.html') && pdfUrl.includes('file=')) {
      const urlObj = new URL(pdfUrl);
      const realUrl = urlObj.searchParams.get('file');
      if (realUrl) {
        pdfUrl = realUrl;
        enviarLog('info', `URL real do PDF extraída: ${pdfUrl}`);
      }
    }


    if (!pdfUrl) {
      enviarLog('erro', 'Não foi possível encontrar o link do PDF após o clique!');
      return;
    }

    // 7. Baixa com nome personalizado
    baixarComNomePersonalizado(pdfUrl, nomeArquivo);
  }

  const baixarComNomePersonalizado = (url, nome) => {
    enviarLog('info', `Iniciando download com nome: ${nome}`);
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        enviarLog('ok', `Download finalizado como: ${nome}`);
      })
      .catch(err => enviarLog('erro', `Erro no fetch personalizado: ${err}`));
  }

  const enviarLog = (tipo, msg) => {//envia o status para o popup
    chrome.runtime.sendMessage({ from: 'content_script', tipo, log: msg });
  }

  // Listener para mensagem vinda do popup ou background (Aqui que aciona a função quando recebe o clique do popup)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "baixar_pdf") {
      baixarPdfRenomeado(msg.modelo);
    }
  });

})();
