(() => {
  ///// FUNÇÕES AUXILIARES ------------------------------------------------------------
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

  const enviarLog = (tipo, msg) => {//envia o status para o popup
    chrome.runtime.sendMessage({ from: 'content_script', tipo, log: msg });
  }
  ///// FIM FUNÇÕES AUXILIARES --------------------------------------------------------


  const extrairDados = async (modelo) => {
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

    return dados;
  }

   const extrairTitulos = (dados, modelo) => {
    if (!modelo) modelo = 'oficio';

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

    return { p1, p2, p5, nomeArquivo };
  }

  const baixarAnexos = async (titulos) => {

    const tabAnexos = document.querySelectorAll('.nav-tabs')[0]?.children[3]?.children[0]; // aba anexos
    if (!tabAnexos) {
      enviarLog('erro', 'Aba "Anexos" não encontrada');
      return;
    }

    tabAnexos.click();
    await new Promise(r => setTimeout(r, 1000)); // aguarda para carregar

    const anexos = Array.from(document.querySelectorAll('tr')).filter(tr => tr.classList.contains('clicavel'));

    // Processar um a um, em sequência
    for (const anexo of anexos) {
      // anexo.linkEl.click();
      anexo.click();
      await new Promise(r => setTimeout(r, 2000));

      let pdfUrl = null;

      // Tenta pegar de <a>
      const link = [...document.querySelectorAll('a')].find(a => a.href?.includes('.pdf'));
      if (link) pdfUrl = link.href;

      // Tenta pegar de <iframe>
      const iframe = [...document.querySelectorAll('iframe')].find(i => i.src?.includes('.pdf'));
      if (!pdfUrl && iframe) pdfUrl = iframe.src;

      // Extrai a URL real se estiver usando PDF.js
      if (pdfUrl?.includes('viewer.html') && pdfUrl.includes('file=')) {
        const urlObj = new URL(pdfUrl);
        const realUrl = urlObj.searchParams.get('file');
        if (realUrl) {
          pdfUrl = realUrl;
          /* enviarLog('info', `URL real do PDF extraída: ${pdfUrl}`); */
        }
      }

      let titulo = anexo?.children[0]?.children[0]?.innerHTML;//Documento principal
      if (!titulo) titulo = anexo?.children[0]?.innerHTML;//Anexos
      titulo = normalizarTexto(titulo);

      if (!pdfUrl) {
        enviarLog('erro', `Não foi possível encontrar a URL do PDF para o anexo "${titulo}"`);
        continue;
      }

      const { p1, p2, p5, nomeArquivo } = titulos;
      
      let nomeBase = 'Nome base';
      if(p5 === titulo) nomeBase = nomeArquivo;//Documento principal
      else nomeBase = `${p1}_${p2}_${titulo}`;//Anexos

      baixarComNomePersonalizado(pdfUrl, nomeBase);
    }
  };

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

  // Listener para mensagem vinda do popup ou background (Aqui que aciona a função quando recebe o clique do popup)
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === "baixar_pdf") {
      let modelo = msg.modelo;
      if(!modelo) return enviarLog('erro', 'Modelo não definido!');

      const dados = await extrairDados(modelo);
      const titulos = extrairTitulos(dados, modelo);
      await baixarAnexos(titulos);
      enviarLog("info", "Processo finalizado!")
    }
  });

})();
