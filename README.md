# 🎬 Video Switcher - Aplicação Web de Mesa de Corte

Uma aplicação web completa de Video Switcher (Mesa de Corte) para rede local (LAN), baseada na arquitetura "Program/Preview". Permite upload de vídeos e compartilhamento de tela com áudio para transmissão ao vivo.

## 🚀 Funcionalidades

- **Upload de Vídeos**: Envio de arquivos de vídeo para a biblioteca de mídia
- **Compartilhamento de Tela**: Captura de tela com áudio usando WebRTC
- **Sistema Preview/Program**: Arquitetura profissional de mesa de corte
- **Transmissão em Tempo Real**: WebRTC para baixa latência
- **Interface Moderna**: Design responsivo e intuitivo
- **Múltiplos Clientes**: Suporte a vários operadores simultâneos

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Socket.IO** - Comunicação em tempo real
- **Multer** - Upload de arquivos

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilos modernos com gradientes e glassmorphism
- **JavaScript ES6+** - Lógica do cliente
- **WebRTC** - Compartilhamento de tela e streaming
- **Socket.IO Client** - Comunicação com servidor

## 📁 Estrutura do Projeto

```
/switcher-web
├── public/
│   ├── uploads/           # Armazenamento de vídeos
│   ├── control.html       # Painel de controle (operador)
│   ├── output.html        # Resultado ao vivo
│   ├── share.html         # Compartilhamento de tela
│   ├── main.css           # Estilos da aplicação
│   └── client.js          # Lógica JavaScript do frontend
├── server.js              # Servidor Node.js
└── package.json           # Dependências do projeto
```

## 🚀 Instalação e Execução

### 1. Instalar Dependências
```bash
npm install
```

### 2. Executar o Servidor
```bash
npm start
```

### 3. Acessar a Aplicação
- **Painel de Controle**: http://localhost:3000/control.html
- **Output (Ao Vivo)**: http://localhost:3000/output.html
- **Compartilhamento**: http://localhost:3000/share.html

## 📖 Como Usar

### 1. Painel de Controle (control.html)
- **Upload**: Arraste vídeos ou clique para selecionar
- **Media Bin**: Clique em qualquer fonte para definir como preview
- **Preview**: Visualize a fonte selecionada
- **Program**: Veja o que está sendo transmitido
- **CUT**: Transfere o preview para o program (ao vivo)

### 2. Compartilhamento de Tela (share.html)
- Digite um nome para a fonte
- Clique em "Compartilhar Tela"
- Selecione a tela/janela desejada
- Marque "Compartilhar áudio" se necessário
- Confirme no navegador

### 3. Output (output.html)
- Exibe automaticamente o que está no "Program"
- Suporte a vídeos e compartilhamento de tela
- Atualização em tempo real

## 🔧 Configuração Avançada

### Porta Personalizada
```bash
PORT=8080 npm start
```

### Servidores STUN/TURN
Edite o arquivo `client.js` para adicionar seus próprios servidores:

```javascript
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Adicione seus servidores TURN aqui
    ]
};
```

## 🌐 Acesso em Rede Local

Para acessar de outros dispositivos na mesma rede:

1. Descubra o IP da máquina:
   ```bash
   # Windows
   ipconfig
   
   # macOS/Linux
   ifconfig
   ```

2. Acesse de outros dispositivos:
   ```
   http://[SEU_IP]:3000/control.html
   ```

## 📱 Recursos da Interface

### Design Moderno
- **Glassmorphism**: Efeitos de vidro e transparência
- **Gradientes**: Cores vibrantes e modernas
- **Responsivo**: Funciona em desktop, tablet e mobile
- **Animações**: Transições suaves e feedback visual

### Funcionalidades Avançadas
- **Status em Tempo Real**: Indicadores de preview e program
- **Upload com Feedback**: Status de envio e validação
- **WebRTC Otimizado**: Baixa latência para compartilhamento
- **Múltiplas Fontes**: Suporte a vários compartilhamentos simultâneos

## 🔒 Segurança

- **Validação de Arquivos**: Apenas vídeos são aceitos
- **Limpeza Automática**: Remoção de fontes desconectadas
- **CORS Configurado**: Acesso controlado em rede local

## 🐛 Solução de Problemas

### WebRTC não funciona
- Verifique se está usando HTTPS em produção
- Teste com servidores STUN diferentes
- Verifique firewall e configurações de rede

### Upload falha
- Verifique permissões da pasta `uploads/`
- Confirme se o arquivo é um vídeo válido
- Verifique tamanho do arquivo

### Compartilhamento não aparece
- Verifique se o navegador suporta `getDisplayMedia`
- Confirme permissões de captura de tela
- Teste em navegador diferente

## 📄 Licença

MIT License - Veja o arquivo LICENSE para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir melhorias
- Enviar pull requests

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no repositório
- Verifique a documentação
- Teste em ambiente local primeiro

---

**Desenvolvido com ❤️ para SOM GARAVELO**
