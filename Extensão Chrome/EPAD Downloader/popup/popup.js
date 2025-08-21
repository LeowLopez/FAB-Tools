document.getElementById('baixarBtn').addEventListener('click', () => {
  const modeloSelecionado = document.getElementById('modeloSelect').value;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'baixar_pdf',
      modelo: modeloSelecionado
    });
  });
});

document.getElementById('baixarSilomsBtn').addEventListener('click', () => {
  const incluirSequencial = document.getElementById('checkSiloms').checked;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'baixar_siloms',
      incluirSequencial: incluirSequencial
    });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.from === 'content_script') {

    // Atualiza status de progresso SILOMS
    if (msg.progressoSiloms) {
      const status = document.getElementById('statusSiloms');
      if (status) {
        if (msg.progressoSiloms.total === msg.progressoSiloms.atual) {
          status.textContent = "Download concluído!";
        }
        else status.textContent = `Baixando ${msg.progressoSiloms.atual} de ${msg.progressoSiloms.total} documentos...`;
      }
    }

    if (msg.log) {
      const logEl = document.getElementById('logConsole');
      if (logEl.classList.contains('oculto')) logEl.classList.remove('oculto');

      const p = document.createElement('p');

      if (msg.tipo === 'copia') {
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = '[Copiar conteúdo]';
        a.style.color = 'mediumblue';
        a.style.textDecoration = 'underline';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigator.clipboard.writeText(msg.log)
            .then(() => {
              a.textContent = '[Copiado!]';
              setTimeout(() => (a.textContent = '[Copiar conteúdo]'), 1500);
            })
            .catch(() => {
              a.textContent = '[Erro ao copiar]';
            });
        });
        p.appendChild(a);
        
      } else {
        p.textContent = msg.log;
        switch (msg.tipo) {
          case 'erro':
            p.style.color = 'red';
            break;
          case 'ok':
            p.style.color = 'green';
            break;
          case 'info':
            p.style.color = 'black';
            break;
          default:
            p.style.color = 'blue';
            break;
        }
      }

      logEl.appendChild(p);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('toggleCreditos');
  const detalhes = document.getElementById('creditosDetalhados');
  const seta = document.getElementById('setaCreditos');

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const aberto = !detalhes.classList.contains('ocultoCreditos');
    detalhes.classList.toggle('ocultoCreditos');
    seta.textContent = aberto ? '▼' : '▲';
  });

  // Alternância de abas (SIGADAER vs SILOMS)
  const sigBtn = document.getElementById('abaSigadaer');
  const silBtn = document.getElementById('abaSiloms');
  const sigArea = document.getElementById('areaSigadaer');
  const silArea = document.getElementById('areaSiloms');

  function ativaAba(ativaBtn, ativaArea, desativaBtn, desativaArea) {
    ativaBtn.classList.add('ativo');
    desativaBtn.classList.remove('ativo');
    ativaArea.style.display = 'block';
    desativaArea.style.display = 'none';
  }

  sigBtn.addEventListener('click', () => {
    ativaAba(sigBtn, sigArea, silBtn, silArea);
  });

  silBtn.addEventListener('click', () => {
    ativaAba(silBtn, silArea, sigBtn, sigArea);
  });

  // Inicializa com SIGADAER ativo
  // ativaAba(sigBtn, sigArea, silBtn, silArea);


  // Detecta o site atual e ativa a aba correspondente
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url || '';

    if (url.includes('siloms.intraer')) {
      ativaAba(silBtn, silArea, sigBtn, sigArea);
    } else {
      ativaAba(sigBtn, sigArea, silBtn, silArea);
    }
  });
});
