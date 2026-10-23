# 🖨️ PrintCost D3D - Calculadora & Gestão de Parque de Impressão 3D
**Danilo Barbosa Vieira ® Todos os direitos reservados**

Um sistema completo, profissional e **100% offline** para cálculo de custos, precificação com lucro garantido e gestão do seu parque de impressoras 3D.

---

## 🚀 Como Executar

* **Modo Aplicativo Nativo (.exe):** Baixe o pacote completo na seção **Releases** e extraia todos os arquivos na mesma pasta. Abra `PrintCost3D.exe` no Windows. Mantenha os arquivos do site, `PrintCost3D.ico`, o logo e o QR Code junto do executável.
* **Modo Navegador:** Abra `index.html` no Chrome, Edge ou outro navegador moderno.

## 💾 Armazenamento dos Dados

* Impressoras, produções, parâmetros padrão e tema são salvos localmente no `localStorage` do navegador. O cadastro de uma impressora e o registro de uma produção são gravados automaticamente, permanecendo disponíveis ao fechar e reabrir o programa no mesmo navegador, perfil do Windows e caminho dos arquivos.
* O sistema funciona offline e não sincroniza os dados com a nuvem. Limpar os dados do navegador ou usar outro perfil/computador pode remover ou tornar os dados indisponíveis; use a opção de exportar backup para manter uma cópia.
* Ao iniciar pela primeira vez, a lista de impressoras e o histórico ficam vazios. Os campos de cálculo não vêm preenchidos com valores de exemplo.

---

## 🌟 Recursos e Melhorias Recentes

### 1. 🧹 Botão "Limpar" Aprimorado
* Limpa imediatamente os campos da peça, peso em gramas, horas/minutos, embalagem, frete e despesas extras.
* O custo é recalculado para R$ 0,00 instantaneamente, deixando a tela pronta para um novo orçamento sem precisar apagar nada manualmente.

### 2. 🧵 Materiais de Filamento Principais
* Menu seletor com os materiais mais usados na impressão 3D:
  * **PLA**, **PLA Silk**, **PETG**, **ABS**, **ASA**, **TPU (Flexível)**, **Nylon (PA)**, **Fibra de Carbono (CF)**, **Resina Standard**, **Resina Alta Resistência** e **Outro (Personalizado)**.
* O preço do KG é informado **manualmente por você**, garantindo total liberdade e precisão.

### 3. 💾 Botão "Registrar Produção" Inteligente
* Salva a peça no histórico e atualiza as métricas acumuladas da impressora (horas rodadas, custo impresso e lucro gerado).
* **Limpeza Automática:** Assim que a peça é registrada com sucesso, os campos são automaticamente limpos para você iniciar o próximo cálculo sem perder tempo.

### 4. 🖼️ Novo Nome "PrintCost D3D" & Logo
* Novo nome oficial aplicado em todo o sistema.
* Estrutura preparada para receber a sua logo: basta colocar o arquivo com o nome **`logo.png`** nesta pasta (`c:\Users\Danilo\Documents\Calculadora 3D\logo.png`) que ela será exibida automaticamente no topo do programa! Caso não haja imagem, o programa usa o ícone moderno integrado.

### 5. 💖 Aba "Apoie o Projeto (PIX)"
* Mensagem oficial do desenvolvedor sobre a evolução do software e o sonho de adquirir a **Bambu Lab A1 Mini**.
* Chave PIX oficial (E-mail): **`danilobavi.dev@gmail.com`** com botão de copiar em um clique e QR Code para doações (`qrcode-pix.jpg`).
* Canal de SAC e suporte técnico direto com o desenvolvedor: **`danilobavi.dev@gmail.com`**.

### 6. ® Direitos Reservados e SAC no Rodapé
* Exibição no rodapé: `PrintCost D3D ® Todos os direitos reservados • Danilo Barbosa Vieira`.
* Hiperlink de contato direto para o SAC: `danilobavi.dev@gmail.com`.

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](./LICENSE). Você pode usar, copiar, modificar e redistribuir o código, desde que mantenha o aviso de direitos autorais e a licença.
