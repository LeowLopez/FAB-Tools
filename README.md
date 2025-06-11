## Como instalar

1. Faça o download e **extraia a pasta** da extensão.
2. Abra o Chrome e acesse:

   ```
   chrome://extensions
   ```

3. Ative o **Modo do desenvolvedor** no canto superior direito.
4. Clique em **“Carregar sem compactação”**.
5. Selecione a **pasta da extensão extraída**.
6. O ícone da extensão aparecerá à direita da barra de endereços.


## Para devs

Em caso de os elementos da página do SIGADAER mudarem e não encontrar mais os elementos para montar os objetos:

   ```
      document.querySelectorAll('.nav-tabs')[0].children[3].children[0].click();//procurar manualmente via inspecionar elemento;

      // Espera um tempo se necessário para que o conteúdo seja carregado dinamicamente
      setTimeout(() => {
      const content = document.querySelector('.tab-content .tab-pane.active').innerHTML;//imprime o conteúdo da página clicada para procurar onde estão localizados
      console.log(content);
      }, 500);
   ```
