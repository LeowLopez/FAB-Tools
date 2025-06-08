(() => {
    // Cria botão azul fixo
    const botao = document.createElement('button');
    botao.textContent = '⏬ Baixar PDF renomeado';
    botao.style.position = 'fixed';
    botao.style.top = '20px';
    botao.style.right = '20px';
    botao.style.zIndex = 9999;
    botao.style.backgroundColor = '#007bff';
    botao.style.color = 'white';
    botao.style.border = 'none';
    botao.style.padding = '10px 15px';
    botao.style.borderRadius = '5px';
    botao.style.cursor = 'pointer';
    botao.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    document.body.appendChild(botao);

    botao.addEventListener('click', async () => {
        // Seu código original dentro da função async
        // 1. Abre a aba "Informações"
        document.querySelectorAll('.nav-tabs')[0].children[1].children[0].click();
        await new Promise(r => setTimeout(r, 1000));

        // 2. Extrai os metadados
        const dados = {};
        document.querySelectorAll('jhi-documento-tab-details p').forEach(p => {
            const campo = p.querySelector('b')?.textContent?.replace(':', '').trim();
            let valor = p.textContent.replace(campo + ':', '').trim();
            if (p.querySelector('strong')) {
                valor = p.querySelector('strong').textContent.trim();
            }
            if (campo) dados[campo] = valor;
        });

        /*
        nomeArquivo deve ser:
        const p1 = dados['Data do Documento'] //=> converter a data para o formato AAAAMMDD
        const p2 = "Of "+dados['Número do Documento'] //=> deve ser passado num regex para retirar as barras do nome
        const p3 = dados['Órgão de Origem']
        const p4 = dados['Órgão de Destino']
        const p5 = dados['Assunto']
        const nomeArquivo = `${p1}_${p2}_${p3}-${p4}_${p5}`;
        */

        // 3. Define nome do arquivo
        const nomeArquivo = `${dados['NUP'] || 'documento'} - ${dados['Número do Documento'] || 'sem-numero'} - ${dados['Assunto'] || 'sem-assunto'}`.replace(/[\\/:*?"<>|]/g, '_') + '.pdf';

        // 4. Interceptar e cancelar o download original
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this._url = url; // salva a URL
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (...args) {
            if (this._url?.includes('.pdf')) {
                console.log('📥 Interceptado PDF:', this._url);
                // Cancela a requisição original
                this.abort();
                // Restaura os métodos originais para não interferir em outras requisições
                XMLHttpRequest.prototype.open = originalOpen;
                XMLHttpRequest.prototype.send = originalSend;
                baixarComNomePersonalizado(this._url, nomeArquivo);
            } else {
                return originalSend.apply(this, args);
            }
        };

        // 5. Simula clique no botão de download
        const downloadBtn = Array.from(document.querySelectorAll('button')).find(btn =>
            btn.textContent.includes('Download')
        );
        if (downloadBtn) {
            downloadBtn.click();
        } else {
            console.error('Botão de download não encontrado!');
        }

        // 6. Faz o download com nome customizado
        function baixarComNomePersonalizado(url, nome) {
            fetch(url)
                .then(res => res.blob())
                .then(blob => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = nome;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    console.log('✅ Download iniciado como:', nome);
                })
                .catch(err => console.error('Erro no download:', err));
        }
    });
})();
