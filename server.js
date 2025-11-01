const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração do Multer para upload de vídeos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedVideoTypes = /mp4|webm|ogg|avi|mov/;
    const allowedImageTypes = /jpg|jpeg|png|gif|bmp|webp/;
    const extname = path.extname(file.originalname).toLowerCase();
    const isVideo = allowedVideoTypes.test(extname);
    const isImage = allowedImageTypes.test(extname);
    
    if (isVideo || isImage) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de vídeo e imagem são permitidos!'));
    }
  }
});

// Estado Global do Servidor
let mediaList = [];
let programSource = null;
let previewSource = null;

// Função para ler arquivos de vídeo da pasta uploads
function updateMediaListFromFiles() {
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    return;
  }
  
  const files = fs.readdirSync(uploadsDir);
  const mediaFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
  });
  
  // Remover arquivos de mídia que não existem mais
  mediaList = mediaList.filter(media => {
    if (media.type === 'video' || media.type === 'image') {
      return fs.existsSync(path.join(uploadsDir, path.basename(media.path)));
    }
    return true;
  });
  
  // Adicionar novos arquivos de mídia
  mediaFiles.forEach(file => {
    const filePath = `/uploads/${file}`;
    const exists = mediaList.some(media => media.path === filePath);
    
    if (!exists) {
      const ext = path.extname(file).toLowerCase();
      const isVideo = ['.mp4', '.webm', '.ogg', '.avi', '.mov'].includes(ext);
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
      
      mediaList.push({
        type: isVideo ? 'video' : 'image',
        name: path.parse(file).name,
        path: filePath
      });
    }
  });
}

// Rota para upload de mídia (vídeos e imagens)
app.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  
  updateMediaListFromFiles();
  
  // Emitir atualização da lista de mídia para todos os clientes
  io.emit('update-media-list', mediaList);
  
  const fileType = req.file.mimetype.startsWith('video/') ? 'vídeo' : 'imagem';
  
  res.json({ 
    success: true, 
    message: `${fileType} enviado com sucesso!`,
    filename: req.file.filename,
    type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
  });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Enviar estado atual para o cliente recém-conectado
  socket.emit('update-media-list', mediaList);
  socket.emit('update-preview', previewSource);
  socket.emit('update-program', programSource);
  
  // Evento quando compartilhamento de tela é iniciado
  socket.on('share-started', (data) => {
    console.log('🖥️ Compartilhamento iniciado:', {
      socketId: socket.id,
      name: data.name,
      timestamp: new Date().toISOString()
    });
    
    // Adicionar à lista de mídia
    const screenshareSource = {
      type: 'screenshare',
      id: socket.id,
      name: data.name || 'Compartilhamento de Tela'
    };
    
    // Remover screenshare anterior do mesmo socket se existir
    mediaList = mediaList.filter(media => 
      !(media.type === 'screenshare' && media.id === socket.id)
    );
    
    mediaList.push(screenshareSource);
    
    console.log('📋 Media list atualizada:', mediaList.length, 'itens');
    
    // Emitir atualização para todos os clientes
    io.emit('update-media-list', mediaList);
  });
  
  // Evento para definir preview
  socket.on('set-preview', (source) => {
    console.log('Preview definido:', source);
    previewSource = source;
    
    // Emitir apenas para control.html (todos os clientes de controle)
    io.emit('update-preview', previewSource);
  });
  
  // Evento para ir ao vivo (CUT)
  socket.on('go-live', () => {
    console.log('Indo ao vivo:', previewSource);
    
    if (previewSource) {
      programSource = previewSource;
      
      // Emitir para output.html (resultado ao vivo)
      io.emit('set-program', programSource);
      
      // Emitir para control.html (atualização do programa)
      io.emit('update-program', programSource);
    }
  });
  
  // Eventos WebRTC - retransmissão entre share.html e output.html
  socket.on('webrtc-offer', (data) => {
    console.log('📡 WebRTC Offer recebido:', {
      from: socket.id,
      to: data.targetSocketId,
      hasOffer: !!data.offer,
      timestamp: new Date().toISOString()
    });
    // Retransmitir para o socket de destino
    io.to(data.targetSocketId).emit('webrtc-offer', {
      offer: data.offer,
      fromSocketId: socket.id
    });
  });
  
  socket.on('webrtc-answer', (data) => {
    console.log('📡 WebRTC Answer recebido:', {
      from: socket.id,
      to: data.targetSocketId,
      hasAnswer: !!data.answer,
      timestamp: new Date().toISOString()
    });
    // Retransmitir para o socket de destino
    io.to(data.targetSocketId).emit('webrtc-answer', {
      answer: data.answer,
      fromSocketId: socket.id
    });
  });
  
  socket.on('webrtc-ice-candidate', (data) => {
    console.log('📡 WebRTC ICE Candidate recebido:', {
      from: socket.id,
      to: data.targetSocketId,
      hasCandidate: !!data.candidate,
      timestamp: new Date().toISOString()
    });
    // Retransmitir para o socket de destino
    io.to(data.targetSocketId).emit('webrtc-ice-candidate', {
      candidate: data.candidate,
      fromSocketId: socket.id
    });
  });
  
  // Evento para receber chunks de vídeo (fallback)
  socket.on('screen-chunk', (data) => {
    console.log('📹 Chunk de vídeo recebido:', {
      from: socket.id,
      size: data.data ? data.data.length : 0,
      timestamp: data.timestamp
    });
    
    // Retransmitir chunk para todos os outputs
    socket.broadcast.emit('screen-chunk', {
      data: data.data,
      timestamp: data.timestamp,
      fromSocketId: socket.id
    });
  });

  // Evento de desconexão
  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
    
    // Verificar se era um screenshare e removê-lo da lista
    const screenshareIndex = mediaList.findIndex(media => 
      media.type === 'screenshare' && media.id === socket.id
    );
    
    if (screenshareIndex !== -1) {
      console.log('🗑️ Removendo screenshare da lista');
      mediaList.splice(screenshareIndex, 1);
      io.emit('update-media-list', mediaList);
    }
  });
});

// Inicializar lista de mídia ao iniciar o servidor
updateMediaListFromFiles();

const PORT = process.env.PORT || 7777;
const HOST = '0.0.0.0'; // Aceita conexões de qualquer IP

server.listen(PORT, HOST, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse localmente: http://localhost:${PORT}/control.html`);
  console.log(`Acesse na rede: http://192.168.1.160:${PORT}/control.html`);
  console.log(`Output: http://192.168.1.160:${PORT}/output.html`);
  console.log(`Compartilhamento: http://192.168.1.160:${PORT}/share.html`);
});
