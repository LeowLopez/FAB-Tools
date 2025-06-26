document.getElementById('baixarBtn').addEventListener('click', () => {
  const modeloSelecionado = document.getElementById('modeloSelect').value;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'baixar_pdf',
      modelo: modeloSelecionado
    });
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.from === 'content_script' && msg.log) {
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
      // Aplica a cor baseada no tipo
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
    logEl.scrollTop = logEl.scrollHeight; // rola para o final
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
});
