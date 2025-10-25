# 🌐 Acesso em Rede Local - Video Switcher

## 📍 **URLs para Acesso Externo**

### **No seu computador (localhost):**
- **Controle**: http://localhost:3000/control.html
- **Output**: http://localhost:3000/output.html  
- **Compartilhamento**: http://localhost:3000/share.html

### **De outros dispositivos na rede:**
- **Controle**: http://192.168.1.160:3000/control.html
- **Output**: http://192.168.1.160:3000/output.html
- **Compartilhamento**: http://192.168.1.160:3000/share.html

## 🔧 **Como Acessar de Outros Dispositivos**

### **1. Celular/Tablet:**
- Conecte na mesma rede Wi-Fi
- Abra o navegador
- Digite: `http://192.168.1.160:3000/control.html`

### **2. Outro Computador:**
- Conecte na mesma rede
- Abra o navegador
- Digite: `http://192.168.1.160:3000/control.html`

### **3. Smart TV (se suportar navegador):**
- Conecte na mesma rede
- Abra o navegador
- Digite: `http://192.168.1.160:3000/output.html`

## 🎬 **Cenários de Uso**

### **Cenário 1: Operador + Tela Externa**
- **Operador**: Use `control.html` no seu computador
- **Tela Externa**: Use `output.html` em TV/Projetor
- **Compartilhamento**: Use `share.html` em outro dispositivo

### **Cenário 2: Múltiplos Operadores**
- **Operador 1**: `control.html` no computador principal
- **Operador 2**: `control.html` em outro computador
- **Output**: `output.html` na tela de transmissão

### **Cenário 3: Apresentação Remota**
- **Apresentador**: `share.html` no laptop
- **Operador**: `control.html` no computador
- **Audiência**: `output.html` em telas/projetores

## 🔒 **Segurança**

- ✅ **Rede Local**: Apenas dispositivos na mesma rede podem acessar
- ✅ **Sem Senha**: Acesso direto para facilitar uso
- ✅ **Tempo Real**: Socket.IO para sincronização instantânea

## 🐛 **Solução de Problemas**

### **Não consegue acessar de outros dispositivos:**
1. Verifique se estão na mesma rede Wi-Fi
2. Confirme o IP: `192.168.1.160`
3. Teste primeiro no próprio computador: `http://192.168.1.160:3000`

### **Firewall bloqueando:**
```bash
# No macOS, permitir conexões na porta 3000
sudo pfctl -f /etc/pf.conf
```

### **Porta já em uso:**
```bash
# Parar outros serviços na porta 3000
lsof -ti:3000 | xargs kill -9
```

## 📱 **Teste Rápido**

1. **No seu computador**: Abra `http://192.168.1.160:3000/control.html`
2. **No celular**: Conecte na mesma Wi-Fi e abra `http://192.168.1.160:3000/output.html`
3. **Teste upload**: Envie um vídeo pelo controle
4. **Teste compartilhamento**: Use `share.html` no celular

## 🎯 **Dicas de Uso**

- **Operador**: Sempre use `control.html` para controle total
- **Output**: Use `output.html` para exibir o resultado final
- **Compartilhamento**: Use `share.html` para capturar telas/janelas
- **Múltiplas fontes**: Pode ter vários compartilhamentos simultâneos

---
**🎬 Video Switcher está pronto para uso em rede local!**
