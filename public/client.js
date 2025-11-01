// Cliente Socket.IO
const socket = io();

// Detectar qual página está sendo usada
const currentPage = window.location.pathname.split('/').pop();

// Variáveis globais
let currentStream = null;
let peerConnection = null;
let isSharing = false;

// Configuração WebRTC otimizada para Chrome
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    iceTransportPolicy: 'all'
};

// ==================== CONTROL.HTML ====================
if (currentPage === 'control.html') {
    const uploadForm = document.getElementById('upload-form');
    const videoInput = document.getElementById('video-input');
    const uploadStatus = document.getElementById('upload-status');
    const mediaList = document.getElementById('media-list');
    const previewVideo = document.getElementById('preview-video');
    const programVideo = document.getElementById('program-video');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const programPlaceholder = document.getElementById('program-placeholder');
    const goLiveBtn = document.getElementById('go-live-btn');
    const previewStatus = document.getElementById('preview-status');
    const programStatus = document.getElementById('program-status');

    let currentPreviewSource = null;

    // Upload de vídeos
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!videoInput.files[0]) {
            showUploadStatus('Selecione um arquivo de vídeo', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('video', videoInput.files[0]);

        try {
            showUploadStatus('Enviando vídeo...', 'loading');
            
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                showUploadStatus('Vídeo enviado com sucesso!', 'success');
                videoInput.value = '';
            } else {
                showUploadStatus('Erro ao enviar vídeo: ' + result.error, 'error');
            }
        } catch (error) {
            showUploadStatus('Erro ao enviar vídeo: ' + error.message, 'error');
        }
    });

    function showUploadStatus(message, type) {
        uploadStatus.textContent = message;
        uploadStatus.className = `upload-status ${type}`;
        
        if (type === 'success') {
            setTimeout(() => {
                uploadStatus.textContent = '';
                uploadStatus.className = 'upload-status';
            }, 3000);
        }
    }

    // Atualizar lista de mídia
    socket.on('update-media-list', (list) => {
        renderMediaList(list);
    });

    function renderMediaList(list) {
        if (list.length === 0) {
            mediaList.innerHTML = '<div class="empty-state"><span>Nenhum arquivo carregado</span></div>';
            return;
        }

        mediaList.innerHTML = list.map(media => `
            <div class="media-item" data-type="${media.type}" data-source='${JSON.stringify(media)}'>
                <div class="media-icon">
                    ${media.type === 'video' ? '🎬' : '🖥️'}
                </div>
                <div class="media-info">
                    <div class="media-name">${media.name}</div>
                    <div class="media-type">${media.type === 'video' ? 'Vídeo' : 'Compartilhamento'}</div>
                </div>
            </div>
        `).join('');

        // Adicionar event listeners aos itens
        document.querySelectorAll('.media-item').forEach(item => {
            item.addEventListener('click', () => {
                const source = JSON.parse(item.dataset.source);
                setPreview(source);
            });
        });
    }

    function setPreview(source) {
        currentPreviewSource = source;
        socket.emit('set-preview', source);
        updatePreviewDisplay(source);
        updateStatus();
    }

    function updatePreviewDisplay(source) {
        if (source.type === 'video') {
            previewVideo.src = source.path;
            previewVideo.style.display = 'block';
            previewPlaceholder.style.display = 'none';
        } else {
            previewVideo.style.display = 'none';
            previewPlaceholder.style.display = 'flex';
            previewPlaceholder.innerHTML = `
                <div class="placeholder-content">
                    <span class="placeholder-icon">🖥️</span>
                    <p>Compartilhamento: ${source.name}</p>
                </div>
            `;
        }
    }

    function updateStatus() {
        previewStatus.textContent = currentPreviewSource ? currentPreviewSource.name : 'Nenhum';
        goLiveBtn.disabled = !currentPreviewSource;
    }

    // Atualizar preview
    socket.on('update-preview', (source) => {
        if (source) {
            updatePreviewDisplay(source);
        }
    });

    // Atualizar programa
    socket.on('update-program', (source) => {
        if (source) {
            updateProgramDisplay(source);
        }
    });

    function updateProgramDisplay(source) {
        if (source.type === 'video') {
            programVideo.src = source.path;
            programVideo.style.display = 'block';
            programPlaceholder.style.display = 'none';
        } else {
            programVideo.style.display = 'none';
            programPlaceholder.style.display = 'flex';
            programPlaceholder.innerHTML = `
                <div class="placeholder-content">
                    <span class="placeholder-icon">🖥️</span>
                    <p>Compartilhamento: ${source.name}</p>
                </div>
            `;
        }
        programStatus.textContent = source.name;
    }

    // Botão CUT
    goLiveBtn.addEventListener('click', () => {
        if (currentPreviewSource) {
            socket.emit('go-live');
        }
    });
}

// ==================== OUTPUT.HTML ====================
if (currentPage === 'output.html') {
    const programVideo = document.getElementById('program-video');
    const outputPlaceholder = document.getElementById('output-placeholder');
    const outputStatus = document.getElementById('output-status');
    const sourceInfo = document.getElementById('source-info');

    // Receber programa
    socket.on('set-program', (source) => {
        console.log('Programa recebido:', source);
        
        if (source.type === 'video') {
            // Parar qualquer stream WebRTC anterior
            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            
            // Limpar srcObject e definir src
            programVideo.srcObject = null;
            programVideo.src = source.path;
            programVideo.play();
            
            programVideo.style.display = 'block';
            outputPlaceholder.style.display = 'none';
            
            outputStatus.textContent = 'Transmitindo';
            sourceInfo.textContent = source.name;
            
        } else if (source.type === 'screenshare') {
            // Limpar src e iniciar WebRTC
            programVideo.src = '';
            programVideo.style.display = 'block';
            outputPlaceholder.style.display = 'none';
            
            outputStatus.textContent = 'Conectando...';
            sourceInfo.textContent = source.name;
            
            // Iniciar conexão WebRTC como receptor
            startWebRTCReceiver(source.id);
        }
    });

    function startWebRTCReceiver(targetSocketId) {
        console.log('Iniciando WebRTC Receiver para socket:', targetSocketId);
        
        // Fechar conexão anterior se existir
        if (peerConnection) {
            peerConnection.close();
        }
        
        peerConnection = new RTCPeerConnection(rtcConfig);
        
        // Configurar evento de recebimento de stream
        peerConnection.ontrack = (event) => {
            console.log('Stream recebido no output:', event.streams[0]);
            programVideo.srcObject = event.streams[0];
            outputStatus.textContent = 'Transmitindo';
            sourceInfo.textContent = 'Compartilhamento de Tela';
        };

        // Configurar candidatos ICE
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Enviando ICE candidate para transmissor:', targetSocketId);
                socket.emit('webrtc-ice-candidate', {
                    candidate: event.candidate,
                    targetSocketId: targetSocketId
                });
            }
        };

        // Configurar eventos de conexão
        peerConnection.onconnectionstatechange = () => {
            console.log('Estado da conexão (receptor):', peerConnection.connectionState);
            if (peerConnection.connectionState === 'failed') {
                outputStatus.textContent = 'Falha na conexão';
            }
        };

        // Limpar listeners anteriores
        socket.off('webrtc-answer');
        socket.off('webrtc-ice-candidate');

        // Receber answer
        socket.on('webrtc-answer', (data) => {
            console.log('Answer recebido no receptor:', data);
            if (data.fromSocketId === targetSocketId) {
                peerConnection.setRemoteDescription(data.answer)
                    .then(() => console.log('Remote description definida com sucesso'))
                    .catch(error => console.error('Erro ao definir remote description:', error));
            }
        });

        // Receber candidatos ICE
        socket.on('webrtc-ice-candidate', (data) => {
            console.log('ICE candidate recebido no receptor:', data);
            if (data.fromSocketId === targetSocketId) {
                peerConnection.addIceCandidate(data.candidate)
                    .then(() => console.log('ICE candidate adicionado com sucesso'))
                    .catch(error => console.error('Erro ao adicionar ICE candidate:', error));
            }
        });

        // Receber chunks de vídeo (fallback)
        socket.on('screen-chunk', (data) => {
            console.log('📹 Chunk de vídeo recebido no output:', data);
            if (data.fromSocketId === targetSocketId) {
                // Criar elemento de vídeo temporário para decodificar
                const tempVideo = document.createElement('video');
                tempVideo.src = data.data;
                tempVideo.onloadeddata = () => {
                    // Atualizar o vídeo principal
                    programVideo.src = data.data;
                    programVideo.style.display = 'block';
                    outputPlaceholder.style.display = 'none';
                    outputStatus.textContent = 'Transmitindo (Fallback)';
                };
            }
        });

        // Criar offer
        console.log('Criando offer...');
        peerConnection.createOffer()
            .then(offer => {
                console.log('Offer criado, definindo local description...');
                return peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                console.log('Enviando offer para transmissor:', targetSocketId);
                socket.emit('webrtc-offer', {
                    offer: peerConnection.localDescription,
                    targetSocketId: targetSocketId
                });
            })
            .catch(error => {
                console.error('Erro ao criar offer:', error);
                outputStatus.textContent = 'Erro de conexão';
            });
    }
}

// ==================== SHARE.HTML ====================
if (currentPage === 'share.html') {
    const shareBtn = document.getElementById('share-btn');
    const stopShareBtn = document.getElementById('stop-share-btn');
    const preview = document.getElementById('preview');
    const previewPlaceholder = document.getElementById('preview-placeholder');
    const sourceNameInput = document.getElementById('source-name');
    const shareStatus = document.getElementById('share-status');

    shareBtn.addEventListener('click', startScreenShare);
    stopShareBtn.addEventListener('click', stopScreenShare);

    async function startScreenShare() {
        try {
            console.log('🎬 Iniciando compartilhamento de tela...');
            shareStatus.textContent = 'Solicitando permissão...';
            
            // Verificar se é Chrome e tem suporte completo
            const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
            const hasDisplayMedia = navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia;
            
            console.log('🔍 Detecção do navegador:', {
                userAgent: navigator.userAgent,
                isChrome: isChrome,
                hasDisplayMedia: hasDisplayMedia,
                mediaDevices: !!navigator.mediaDevices
            });
            
            if (isChrome && hasDisplayMedia) {
                console.log('✅ Chrome detectado com suporte a getDisplayMedia');
                currentStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always',
                        displaySurface: 'monitor',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });
            } else if (hasDisplayMedia) {
                console.log('📱 Navegador com suporte limitado a getDisplayMedia');
                currentStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });
            } else {
                throw new Error('getDisplayMedia não é suportado neste navegador');
            }

            console.log('✅ Stream obtido:', currentStream);
            console.log('📹 Tracks de vídeo:', currentStream.getVideoTracks().length);
            console.log('🔊 Tracks de áudio:', currentStream.getAudioTracks().length);

            // Verificar se o stream tem conteúdo
            if (currentStream.getVideoTracks().length === 0) {
                throw new Error('Nenhum track de vídeo capturado');
            }

            // Exibir preview
            preview.srcObject = currentStream;
            preview.style.display = 'block';
            previewPlaceholder.style.display = 'none';

            console.log('📡 Notificando servidor...');
            // Notificar servidor
            socket.emit('share-started', {
                name: sourceNameInput.value || 'Compartilhamento de Tela'
            });

            // Atualizar UI
            shareBtn.style.display = 'none';
            stopShareBtn.style.display = 'inline-flex';
            shareStatus.textContent = 'Compartilhando';
            isSharing = true;

            console.log('🔧 Configurando WebRTC...');
            // Configurar WebRTC (transmissor)
            setupWebRTCTransmitter();

            // Detectar quando o usuário para o compartilhamento
            currentStream.getVideoTracks()[0].onended = () => {
                console.log('⏹️ Compartilhamento finalizado pelo usuário');
                stopScreenShare();
            };

            console.log('✅ Compartilhamento iniciado com sucesso!');

        } catch (error) {
            console.error('❌ Erro ao iniciar compartilhamento:', error);
            console.error('Detalhes do erro:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Tentar Canvas fallback apenas se getDisplayMedia não funcionar
            if (error.name === 'NotSupportedError' || error.message.includes('getDisplayMedia')) {
                console.log('🔄 getDisplayMedia não suportado, tentando Canvas fallback...');
                try {
                    await startCanvasScreenShare();
                    return;
                } catch (canvasError) {
                    console.error('❌ Canvas também falhou:', canvasError);
                }
            }
            
            let errorMessage = 'Erro ao iniciar compartilhamento';
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Permissão negada. Clique em "Permitir" quando solicitado.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Navegador não suporta compartilhamento de tela.';
            } else if (error.name === 'AbortError') {
                errorMessage = 'Compartilhamento cancelado.';
            } else if (error.message.includes('Nenhum track')) {
                errorMessage = 'Falha ao capturar vídeo. Tente novamente.';
            }
            
            shareStatus.textContent = errorMessage;
        }
    }

    // Função de fallback usando Canvas
    async function startCanvasScreenShare() {
        console.log('🔄 Iniciando fallback com Canvas...');
        console.log('🔍 html2canvas disponível:', !!window.html2canvas);
        
        try {
            // Criar canvas oculto para captura
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1920;
            canvas.height = 1080;
            canvas.style.display = 'none';
            // Otimizar para leitura frequente
            ctx.willReadFrequently = true;
            document.body.appendChild(canvas);

            // Função para capturar tela usando html2canvas se disponível
            const captureScreen = () => {
                return new Promise((resolve, reject) => {
                    // Tentar usar html2canvas se disponível
                    if (window.html2canvas) {
                        console.log('🎨 Usando html2canvas para captura...');
                        
                        // Tentar capturar a janela inteira primeiro
                        html2canvas(document.documentElement, {
                            width: window.innerWidth,
                            height: window.innerHeight,
                            scale: 0.5,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: '#ffffff',
                            logging: false,
                            removeContainer: true,
                            foreignObjectRendering: true,
                            imageTimeout: 0,
                            scrollX: 0,
                            scrollY: 0,
                            windowWidth: window.innerWidth,
                            windowHeight: window.innerHeight
                        }).then(canvas => {
                            console.log('✅ html2canvas captura concluída, dimensões:', canvas.width, 'x', canvas.height);
                            
                            // Verificar se a captura tem conteúdo
                            const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
                            const data = imageData.data;
                            let hasContent = false;
                            
                            for (let i = 0; i < data.length; i += 4) {
                                const r = data[i];
                                const g = data[i + 1];
                                const b = data[i + 2];
                                if (r !== 0 || g !== 0 || b !== 0) {
                                    hasContent = true;
                                    break;
                                }
                            }
                            
                            if (hasContent) {
                                ctx.drawImage(canvas, 0, 0);
                                resolve(canvas.toDataURL('image/jpeg', 0.8));
                            } else {
                                console.log('⚠️ Captura vazia, usando fallback visual');
                                // Criar uma imagem mais interessante
                                ctx.fillStyle = '#1a1a1a';
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                
                                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                                gradient.addColorStop(0, '#667eea');
                                gradient.addColorStop(1, '#764ba2');
                                ctx.fillStyle = gradient;
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                                
                                ctx.fillStyle = '#ffffff';
                                ctx.font = 'bold 48px Arial';
                                ctx.textAlign = 'center';
                                ctx.shadowColor = 'rgba(0,0,0,0.5)';
                                ctx.shadowBlur = 10;
                                ctx.fillText('Compartilhamento de Tela', canvas.width/2, canvas.height/2 - 30);
                                ctx.font = '24px Arial';
                                ctx.fillText('(html2canvas capturou fundo vazio)', canvas.width/2, canvas.height/2 + 30);
                                ctx.shadowBlur = 0;
                                
                                resolve(canvas.toDataURL('image/jpeg', 0.8));
                            }
                        }).catch(error => {
                            console.warn('❌ html2canvas falhou, usando fallback:', error);
                            // Fallback se html2canvas falhar
                            ctx.fillStyle = '#1a1a1a';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                            gradient.addColorStop(0, '#667eea');
                            gradient.addColorStop(1, '#764ba2');
                            ctx.fillStyle = gradient;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 48px Arial';
                            ctx.textAlign = 'center';
                            ctx.shadowColor = 'rgba(0,0,0,0.5)';
                            ctx.shadowBlur = 10;
                            ctx.fillText('Compartilhamento de Tela', canvas.width/2, canvas.height/2 - 30);
                            ctx.font = '24px Arial';
                            ctx.fillText('(html2canvas falhou)', canvas.width/2, canvas.height/2 + 30);
                            ctx.shadowBlur = 0;
                            
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        });
                    } else {
                        console.log('⚠️ html2canvas não disponível, usando fallback simples');
                        // Fallback: criar uma imagem mais interessante
                        ctx.fillStyle = '#1a1a1a';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Gradiente de fundo
                        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                        gradient.addColorStop(0, '#667eea');
                        gradient.addColorStop(1, '#764ba2');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        
                        // Texto centralizado
                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 48px Arial';
                        ctx.textAlign = 'center';
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = 10;
                        ctx.fillText('Compartilhamento de Tela', canvas.width/2, canvas.height/2 - 30);
                        ctx.font = '24px Arial';
                        ctx.fillText('(Modo Canvas - html2canvas não disponível)', canvas.width/2, canvas.height/2 + 30);
                        ctx.shadowBlur = 0;
                        
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    }
                });
            };

            // Função para enviar captura
            const sendCapture = async () => {
                try {
                    console.log('📸 Capturando tela...');
                    const dataUrl = await captureScreen();
                    console.log('📤 Enviando chunk:', dataUrl.length, 'bytes');
                    socket.emit('screen-chunk', {
                        data: dataUrl,
                        timestamp: Date.now()
                    });
                    console.log('✅ Chunk enviado com sucesso');
                } catch (error) {
                    console.error('❌ Erro ao capturar tela:', error);
                }
            };

            // Iniciar captura periódica (reduzir frequência para melhor performance)
            const captureInterval = setInterval(sendCapture, 2000); // 0.5 FPS para melhor performance

            // Exibir preview (canvas)
            preview.src = canvas.toDataURL();
            preview.style.display = 'block';
            previewPlaceholder.style.display = 'none';

            // Notificar servidor
            socket.emit('share-started', {
                name: sourceNameInput.value || 'Compartilhamento de Tela (Canvas)'
            });

            // Atualizar UI
            shareBtn.style.display = 'none';
            stopShareBtn.style.display = 'inline-flex';
            shareStatus.textContent = 'Compartilhando (Canvas)';
            isSharing = true;

            // Armazenar referências para parar depois
            currentCanvas = canvas;
            currentCaptureInterval = captureInterval;

            console.log('✅ Canvas fallback iniciado com sucesso!');

        } catch (error) {
            console.error('❌ Erro no Canvas fallback:', error);
            throw error;
        }
    }

    // Função de fallback usando MediaRecorder
    async function startScreenShareFallback() {
        console.log('🔄 Iniciando fallback com MediaRecorder...');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Configurar MediaRecorder
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                    // Enviar chunk via Socket.IO
                    const reader = new FileReader();
                    reader.onload = () => {
                        socket.emit('screen-chunk', {
                            data: reader.result,
                            timestamp: Date.now()
                        });
                    };
                    reader.readAsDataURL(event.data);
                }
            };

            mediaRecorder.start(1000); // Enviar dados a cada 1 segundo

            // Exibir preview
            preview.srcObject = stream;
            preview.style.display = 'block';
            previewPlaceholder.style.display = 'none';

            // Notificar servidor
            socket.emit('share-started', {
                name: sourceNameInput.value || 'Compartilhamento de Tela (Fallback)'
            });

            // Atualizar UI
            shareBtn.style.display = 'none';
            stopShareBtn.style.display = 'inline-flex';
            shareStatus.textContent = 'Compartilhando (Fallback)';
            isSharing = true;

            // Armazenar referências para parar depois
            currentStream = stream;
            currentMediaRecorder = mediaRecorder;

            console.log('✅ Fallback iniciado com sucesso!');

        } catch (error) {
            console.error('❌ Erro no fallback:', error);
            throw error;
        }
    }

    function stopScreenShare() {
        console.log('⏹️ Parando compartilhamento...');
        
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }

        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }

        if (currentMediaRecorder) {
            currentMediaRecorder.stop();
            currentMediaRecorder = null;
        }

        if (currentCanvas) {
            document.body.removeChild(currentCanvas);
            currentCanvas = null;
        }

        if (currentCaptureInterval) {
            clearInterval(currentCaptureInterval);
            currentCaptureInterval = null;
        }

        // Limpar UI
        preview.srcObject = null;
        preview.src = '';
        preview.style.display = 'none';
        previewPlaceholder.style.display = 'flex';

        shareBtn.style.display = 'inline-flex';
        stopShareBtn.style.display = 'none';
        shareStatus.textContent = 'Pronto';
        isSharing = false;
        
        console.log('✅ Compartilhamento parado');
    }

    function setupWebRTCTransmitter() {
        // Limpar listeners anteriores
        socket.off('webrtc-offer');
        socket.off('webrtc-ice-candidate');
        
        // Receber offer
        socket.on('webrtc-offer', (data) => {
            console.log('Offer recebido no transmissor:', data);
            if (data.fromSocketId) {
                handleWebRTCOffer(data.offer, data.fromSocketId);
            }
        });

        // Receber candidatos ICE
        socket.on('webrtc-ice-candidate', (data) => {
            console.log('ICE candidate recebido no transmissor:', data);
            if (data.fromSocketId && peerConnection) {
                peerConnection.addIceCandidate(data.candidate)
                    .catch(error => console.error('Erro ao adicionar ICE candidate:', error));
            }
        });
    }

    async function handleWebRTCOffer(offer, fromSocketId) {
        if (!currentStream) {
            console.log('❌ Sem stream disponível para compartilhamento');
            return;
        }

        console.log('🔄 Processando offer do socket:', fromSocketId);
        
        // Fechar conexão anterior se existir
        if (peerConnection) {
            console.log('🔄 Fechando conexão anterior');
            peerConnection.close();
        }

        peerConnection = new RTCPeerConnection(rtcConfig);
        
        // Adicionar stream com configurações otimizadas para Chrome
        currentStream.getTracks().forEach(track => {
            console.log('📹 Adicionando track:', track.kind, track.label);
            
            // Configurar track para Chrome
            if (track.kind === 'video') {
                track.applyConstraints({
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                }).catch(err => console.warn('Erro ao aplicar constraints de vídeo:', err));
            }
            
            peerConnection.addTrack(track, currentStream);
        });

        // Configurar candidatos ICE
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📡 Enviando ICE candidate para:', fromSocketId);
                socket.emit('webrtc-ice-candidate', {
                    candidate: event.candidate,
                    targetSocketId: fromSocketId
                });
            } else {
                console.log('✅ ICE gathering completo');
            }
        };

        // Configurar eventos de conexão
        peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Estado da conexão:', peerConnection.connectionState);
            if (peerConnection.connectionState === 'connected') {
                console.log('✅ WebRTC conectado com sucesso!');
            } else if (peerConnection.connectionState === 'failed') {
                console.log('❌ WebRTC falhou, tentando reconectar...');
            }
        };

        // Configurar eventos de stream
        peerConnection.ontrack = (event) => {
            console.log('📺 Stream recebido no transmissor:', event.streams[0]);
        };

        // Definir remote description e criar answer
        try {
            console.log('📥 Definindo remote description...');
            await peerConnection.setRemoteDescription(offer);
            
            console.log('📤 Criando answer...');
            const answer = await peerConnection.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            
            await peerConnection.setLocalDescription(answer);
            
            console.log('📡 Enviando answer para:', fromSocketId);
            socket.emit('webrtc-answer', {
                answer: answer,
                targetSocketId: fromSocketId
            });
            
            console.log('✅ WebRTC configurado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao processar offer:', error);
        }
    }
}

// ==================== UTILITÁRIOS GERAIS ====================

// Detectar desconexão
socket.on('disconnect', () => {
    console.log('Desconectado do servidor');
});

socket.on('connect', () => {
    console.log('Conectado ao servidor');
});

// Limpar recursos ao sair da página
window.addEventListener('beforeunload', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
});
