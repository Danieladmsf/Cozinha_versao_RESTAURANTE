# VR Soft API

API de integração para dados do VR Software (PostgreSQL).

## Estrutura Simplificada

A pasta agora contém apenas os arquivos essenciais para o funcionamento:

### Servidor Virtual (VM Auto.Sky)
- **`extrair_dados.js`**: O "cérebro" que puxa os dados do banco VR.
- **`EXTRAIR_DADOS_LOOP.bat`**: Script que roda o extrator (clique nele para rodar manualmente).
- **`INICIAR_BACKGROUND.vbs`**: Script para rodar o extrator "escondido" (sem janela preta).
- **`CONFIGURAR_VM_STARTUP.bat`**: Configura o VBS acima para iniciar sozinho com a VM.

### Sua Máquina Local
- **`api_local.js`**: Sua API leve que serve os dados para o site/app.
- **`INICIAR_API_BACKGROUND.bat`**: Inicia a API localmente (já configuramos para rodar automático).
- **`CONFIGURAR_AUTOSTART.bat`**: Configura a API Local para iniciar com o Windows.

### Pastas
- **`dados_extraidos/`**: Onde os arquivos JSON (vendas, produtos) são salvos pela VM e lidos pela API Local.
- **`node/`**: Node.js portátil (para a VM usar).

## Como funciona
1. A **VM** roda o extrator em background → Salva JSONs na pasta compartilhada.
2. A **API Local** lê esses JSONs → Entrega para o Site/App na porta 5001.

Sem instalações complexas, sem `npm install`, sem peso desnecessário.


## Endpoints (http://localhost:5001)
- `/health`: Status
- `/produtos`: Lista de produtos
  - `?limit=100` (padrão)
  - `?search=termo`
- `/produto/:id`: Busca por ID

## O que acontece se eu reiniciar o PC? 🔄
- **No seu Computador**: A API (Porta 5001) liga sozinha com o Windows! Não precisa fazer nada.
- **No Auto.Sky (VM)**: Assim que você abrir o sistema VR, o extrator liga e começa a atualizar os dados.

## Notas Importantes
- **Limite de Dados**: O extrator padrão busca 50 produtos para teste. Edite `extrair_dados.js` para aumentar esse limite.
- **VPN**: O Auto.Sky não permite acesso direto VPN. Esta solução usa o disco compartilhado para contornar isso com segurança.
