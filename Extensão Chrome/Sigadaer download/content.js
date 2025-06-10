(() => {
  ///// FUNÇÕES AUXILIARES ------------------------------------------------------------
  const normalizarTexto = texto => {
    return texto
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') //remove acentos
      .replace(/\.(docx|xlsx|pptx?|pdf)$/i, '') //remove extensões
      .replace(/[^\w\s-]/g, '') //remove caracteres especiais
      .replace(/\s*-\s*/g, '-')// substitui " - " → "-"
      //.replace(/\s+/g, '_') //espaços por _
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
  };
  ///// FIM FUNÇÕES AUXILIARES --------------------------------------------------------


  const extrairDados = async () => {
    enviarLog("info", "Extraindo dados...");

    const abasMenu = Array.from(document.querySelectorAll('.nav-tabs li a') || []);
    let abaDetalhes = null;

    for (const aba of abasMenu) {

      aba.click();// Clica na aba atual
      await new Promise(resolve => setTimeout(resolve, 300)); // Aguarda um pequeno tempo para a aba renderizar

      let abaNome = aba?.innerText?.trim();
      if (abaNome === 'Detalhes') abaDetalhes = aba;//identifica aba Detalhes
      if (abaDetalhes) break;//interrompe o laço

    }

    if (!abaDetalhes) {
      enviarLog('erro', 'Aba "Informações" não encontrada!');
      return;
    }

    abaDetalhes.click();
    await new Promise(r => setTimeout(r, 1000));

    // 2. Extrai os metadados que estão organizados dentro de parágrafos e negritos, dentro da aba aberta
    // Organização => <p><b>CAMPO</b>VALOR</p>
    // Transformar em => dados = {CAMPO1: "VALOR1", CAMPO2: "VALOR2", ...}, então dados['CAMPO_NOME'] = valor_campo
    const dados = {};

    const container = document.querySelector('.tab-content .tab-pane.active');//conteúdo aba ativa
    if (container) {
      const paragrafos = container.querySelectorAll('p');

      paragrafos.forEach(p => {
        const campo = p.querySelector('b')?.textContent?.replace(':', '').trim();
        let valor = p.textContent.replace(`${campo}:`, '').trim();

        // Se houver <strong>, ele prevalece como valor
        if (p.querySelector('strong')) {
          valor = p.querySelector('strong').textContent.trim();
        }

        if (campo) {
          dados[campo] = valor;
        }
      });

    } else {
      return enviarLog('erro', 'Nenhum conteúdo encontrado na aba ativa.');

    }

    enviarLog("info", "Dados extraídos.");
    return dados;
  };

  const extrairTitulos = (dados, modelo) => {
    if (!modelo) modelo = 'oficio';

    // Declare variables at the top
    let DATA, ID, ORIGEM, DESTINO, ASSUNTO, nomeArquivo;

    switch (modelo) {
      case 'oficio':
        DATA = formatarData(dados['Data do Documento'] || '');
        ID = 'Of_' + normalizarTexto((dados['Número do Documento'] || '').replace(/\//g, ''));//remove barras
        ORIGEM = normalizarTexto(dados['Órgão de Origem'] || dados['Local de Origem'] || '');
        DESTINO = normalizarTexto(dados['Órgão de Destino'] || '');
        ASSUNTO = normalizarTexto(dados['Assunto'] || '');
        nomeArquivo = `${DATA}_${ID}_${ORIGEM}-${DESTINO}_${ASSUNTO}.pdf`;
        break;

      case 'minuta':
        DATA = formatarData(dados['Data do Documento'] || '');
        ID = 'Localizador_' + normalizarTexto(dados['Localizador'] || '');
        ORIGEM = normalizarTexto(dados['Órgão de Origem'] || dados['Local de Origem'] || '');
        DESTINO = normalizarTexto(dados['Órgão de Destino'] || '');
        ASSUNTO = normalizarTexto(dados['Assunto'] || '');
        nomeArquivo = `${DATA}_${ID}_${ORIGEM}-${DESTINO}_${ASSUNTO}_minuta.pdf`;
        break;

      case 'processo':
        DATA = formatarData(dados['Data de elaboração'] || '');
        ID = 'NUP ' + normalizarTexto((dados['NUP'] || '').replace(/[./]/g, ''));//remove pontos ou barras
        ORIGEM = normalizarTexto(dados['Órgão de Origem'] || dados['Local de Origem'] || '');
        DESTINO = normalizarTexto(dados['Órgão de Destino'] || '');
        ASSUNTO = normalizarTexto(dados['Assunto'] || '');
        nomeArquivo = `${DATA}_${ID}_${ORIGEM}-${DESTINO}_${ASSUNTO}.pdf`;
        break;

      case 'despacho':
        DATA = formatarData(dados['Data do Documento'] || '');
        ID = 'Despacho ' + normalizarTexto((dados['Número do Documento'] || '').replace(/\//g, ''));//remove barras
        ORIGEM = normalizarTexto(dados['Órgão de Origem'] || dados['Local de Origem'] || '');
        DESTINO = normalizarTexto(dados['Órgão de Destino'] || '');
        ASSUNTO = normalizarTexto(dados['Assunto'] || '');
        nomeArquivo = `${DATA}_${ID}_${ORIGEM}-${DESTINO}_${ASSUNTO}.pdf`;
        break;

      case 'portaria':
        DATA = formatarData(dados['Data do Documento'] || '');
        ID = 'Portaria ' + normalizarTexto((dados['Número do Documento'] || '').replace(/\//g, ''));//remove barras
        ORIGEM = normalizarTexto(dados['Órgão de Origem'] || dados['Local de Origem'] || '');
        DESTINO = normalizarTexto(dados['Órgão de Destino'] || '');
        ASSUNTO = normalizarTexto(dados['Assunto'] || '');
        nomeArquivo = `${DATA}_${ID}_${ORIGEM}-${DESTINO}_${ASSUNTO}.pdf`;
        break;

      default:
        return enviarLog('erro', `Modelo '${modelo}' não implementado.`);
    }

    if (!nomeArquivo) return enviarLog('erro', 'Nome de arquivo não definido para esse modelo.');
    return { DATA, ID, ASSUNTO, nomeArquivo };
  };

  const baixarAnexos = async (titulos, modelo) => {
    enviarLog("info", "Identificando documentos para download...");

    const abasMenu = Array.from(document.querySelectorAll('.nav-tabs li a') || []);
    let abaAnexos = null;
    let idAbaAnexos = (modelo === 'processo') ? 'Árvore do Processo' : 'Documento / Anexos / Referências';

    for (const aba of abasMenu) {

      aba.click();// Clica na aba atual
      await new Promise(resolve => setTimeout(resolve, 300)); // Aguarda um pequeno tempo para a aba renderizar

      let abaNome = aba?.innerText?.trim();
      if (abaNome === idAbaAnexos) abaAnexos = aba;//identifica onde estão os documentos
      if (abaAnexos) break;//interrompe o laço

    }

    if (!abaAnexos) {
      enviarLog('erro', 'Aba "Anexos" não encontrada!');
      return;
    }

    abaAnexos.click();
    
    await new Promise(r => setTimeout(r, 1000)); // aguarda para carregar

    let anexos = null;
    if(modelo === 'processo') anexos = Array.from(document.querySelectorAll('div')).filter(tr => tr.classList.contains('row-peca'));
    else anexos = Array.from(document.querySelectorAll('tr')).filter(tr => tr.classList.contains('clicavel'));

    // Processar um a um, em sequência
    for (const anexo of anexos) {
      // Checar o "tipo" antes de baixar
      const tipoCell = anexo.children[2]; // terceira coluna deveria ser "Tipo"
      if (tipoCell) {
        const tipoText = tipoCell.textContent?.trim() || '';

        //Pular "Referência do sistema"
        if (tipoText.includes('Referência do sistema')) continue;
      }

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

      let titulo = anexo?.children[0]?.children[0]?.innerHTML; // Documento principal
      if (!titulo) titulo = anexo?.children[0]?.innerHTML; // Anexos
      titulo = normalizarTexto(titulo);

      if (!pdfUrl) {
        enviarLog('erro', `Não foi possível encontrar a URL do PDF para o anexo "${titulo}"`);
        continue;
      }

      const { DATA, ID, ASSUNTO, nomeArquivo } = titulos;

      let nomeBase = 'Nome base';
      if (ASSUNTO === titulo) nomeBase = nomeArquivo; // Documento principal
      else nomeBase = `${DATA}_${ID}_${titulo}`; // Anexos

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
  };

  // Listener para mensagem vinda do popup ou background (Aqui que aciona a função quando recebe o clique do popup)
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    if (msg.action === "baixar_pdf") {
      let modelo = msg.modelo;
      if (!modelo) return enviarLog('erro', 'Modelo não definido!');

      const dados = await extrairDados();
      if (!dados) return;

      const titulos = extrairTitulos(dados, modelo);
      if (!titulos) return;

      await baixarAnexos(titulos, modelo);
      enviarLog("info", "Processo finalizado!")
    }
  });

})();
