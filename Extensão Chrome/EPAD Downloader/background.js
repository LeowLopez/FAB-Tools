chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'verificar_site') {
    const tab = sender.tab;
    const url = tab?.url || '';

    console.log('URL recebida:', url);

    let iconPath = 'icon_inactive.png';

    if (url.includes('sigadaer.intraer') || url.includes('siloms.intraer')) {
      iconPath = 'icon.png';
    }

    if (tab?.id !== undefined) {
      console.log(`Definindo ícone: ${iconPath} para a aba ${tab.id}`);
      chrome.action.setIcon({
        path: {
          "16": iconPath,
          "32": iconPath,
          "48": iconPath,
          "128": iconPath
        },
        tabId: tab.id
      });

    } else {
      console.warn('tabId ausente. Não foi possível alterar o ícone.');
    }
  }
});
