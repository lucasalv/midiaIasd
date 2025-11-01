// Fallback para compartilhamento de tela usando MediaRecorder
// Este arquivo será carregado apenas se WebRTC falhar

class ScreenShareFallback {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.socket = io();
    }

    async startScreenShare() {
        try {
            console.log('🔄 Tentando fallback com MediaRecorder...');
            
            // Obter stream de tela
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Configurar MediaRecorder
            const options = {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 2500000
            };

            this.mediaRecorder = new MediaRecorder(stream, options);
            this.recordedChunks = [];

            // Eventos do MediaRecorder
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                    this.sendChunkToServer(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                console.log('⏹️ Gravação parada');
                this.stopScreenShare();
            };

            // Iniciar gravação
            this.mediaRecorder.start(1000); // Enviar dados a cada 1 segundo
            this.isRecording = true;

            // Exibir preview
            const preview = document.getElementById('preview');
            if (preview) {
                preview.srcObject = stream;
                preview.style.display = 'block';
            }

            // Notificar servidor
            this.socket.emit('share-started', {
                name: 'Compartilhamento de Tela (Fallback)',
                type: 'fallback'
            });

            console.log('✅ Fallback iniciado com sucesso!');

        } catch (error) {
            console.error('❌ Erro no fallback:', error);
            throw error;
        }
    }

    sendChunkToServer(chunk) {
        // Converter chunk para base64 e enviar via Socket.IO
        const reader = new FileReader();
        reader.onload = () => {
            this.socket.emit('screen-chunk', {
                data: reader.result,
                timestamp: Date.now()
            });
        };
        reader.readAsDataURL(chunk);
    }

    stopScreenShare() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
        }
    }
}

// Detectar se WebRTC falhou e usar fallback
if (window.WebRTCFailed) {
    console.log('🔄 WebRTC falhou, ativando fallback...');
    window.screenShareFallback = new ScreenShareFallback();
}
