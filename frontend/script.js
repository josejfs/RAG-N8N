// Configurações da aplicação
const CONFIG = {
    //desenvolvimento
    //CHAT_WEBHOOK: 'https://n8n.srv539289.hstgr.cloud/webhook/6dc67ac6-5287-451b-a0a9-a2a44b6368c4',
    //RAG_WEBHOOK: 'https://n8n.srv539289.hstgr.cloud/form/82848bc4-5ea2-4e5a-8bb6-3c09b94a8c5d',
    //Produção
    CHAT_WEBHOOK: 'https://n8n.srv539289.hstgr.cloud/webhook/6dc67ac6-5287-451b-a0a9-a2a44b6368c4',
    RAG_WEBHOOK: 'https://n8n.srv539289.hstgr.cloud/form/82848bc4-5ea2-4e5a-8bb6-3c09b94a8c5d',
    MAX_MESSAGE_LENGTH: 2000,
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    TYPING_DELAY: 1000,
    STATUS_TIMEOUT: 5000,
    CONVERSATION_HISTORY_LIMIT: 10,
    SUPPORTED_FILE_TYPES: [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/markdown',
        'application/json',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
};

// Estado da aplicação
const AppState = {
    uploadAreaVisible: false,
    selectedFile: null,
    conversationHistory: [],
    isTyping: false,
    isUploading: false
};

// Cache de elementos DOM
const DOM = {
    chatMessages: null,
    messageInput: null,
    sendButton: null,
    uploadArea: null,
    fileUpload: null,
    fileInput: null,
    typingIndicator: null,
    uploadToggle: null,
    fileIcon: null,
    fileTitle: null,
    fileDescription: null,
    uploadButton: null
};

// Utilitários
const Utils = {
    // Debounce para otimizar performance
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle para limitar frequência de execução
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Formatar tamanho de arquivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Validar tipo de arquivo
    isValidFileType(file) {
        return CONFIG.SUPPORTED_FILE_TYPES.includes(file.type) || 
               file.name.match(/\.(pdf|txt|doc|docx|md|json|csv|xlsx|xls)$/i);
    },

    // Validar tamanho de arquivo
    isValidFileSize(file) {
        return file.size <= CONFIG.MAX_FILE_SIZE;
    },

    // Sanitizar HTML para segurança
    sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Detectar dispositivo móvel
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // Vibrar dispositivo (se suportado)
    vibrate(pattern = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
};

// Gerenciador de eventos
const EventManager = {
    init() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupTouchEvents();
    },

    setupEventListeners() {
        // Auto-resize do textarea com debounce
        DOM.messageInput.addEventListener('input', Utils.debounce((e) => this.handleInputResize(e), 100));
        
        // Foco automático no input
        DOM.messageInput.addEventListener('focus', () => {
            if (Utils.isMobile()) {
                setTimeout(() => {
                    DOM.messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });

        // Drag and drop
        this.setupDragAndDrop();
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter para enviar
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                UIManager.sendMessage(); // CORRIGIDO: Chama UIManager.sendMessage()
            }
            
            // Escape para fechar upload
            if (e.key === 'Escape' && AppState.uploadAreaVisible) {
                UIManager.toggleUpload();
            }
        });
    },

    setupTouchEvents() {
        if (Utils.isMobile()) {
            // Swipe para fechar upload
            let startY = 0;
            let startX = 0;
            
            DOM.uploadArea.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
            });

            DOM.uploadArea.addEventListener('touchmove', (e) => {
                if (!startY || !startX) return;
                
                const deltaY = e.touches[0].clientY - startY;
                const deltaX = e.touches[0].clientX - startX;
                
                if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 50) {
                    UIManager.toggleUpload(); // CORRIGIDO: Chama UIManager.toggleUpload()
                    startY = 0;
                    startX = 0;
                }
            });
        }
    },

    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            DOM.fileUpload.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            DOM.fileUpload.addEventListener(eventName, this.highlightUpload, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            DOM.fileUpload.addEventListener(eventName, this.unhighlightUpload, false);
        });

        DOM.fileUpload.addEventListener('drop', this.handleDrop, false);
    },

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    highlightUpload() {
        DOM.fileUpload.style.borderColor = '#007bff';
        DOM.fileUpload.style.background = '#f8f9fa';
    },

    unhighlightUpload() {
        DOM.fileUpload.style.borderColor = AppState.selectedFile ? '#28a745' : '#007bff';
        DOM.fileUpload.style.background = AppState.selectedFile ? '#f8fff8' : '#ffffff';
    },

    handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            DOM.fileInput.files = files;
            UIManager.handleFileSelect(DOM.fileInput);
        }
    },

    handleInputResize(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    },

    // CORRIGIDO: Método movido para o local correto e chama UIManager
    handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            UIManager.sendMessage(); // CORRIGIDO: Chama UIManager.sendMessage()
        }
    }
};

// Gerenciador de UI
const UIManager = {
    init() {
        this.initializeElements();
        this.setupAccessibility();
    },

    initializeElements() {
        DOM.chatMessages = document.getElementById('chatMessages');
        DOM.messageInput = document.getElementById('messageInput');
        DOM.sendButton = document.getElementById('sendButton');
        DOM.uploadArea = document.getElementById('uploadArea');
        DOM.fileUpload = document.getElementById('fileUpload');
        DOM.fileInput = document.getElementById('fileInput');
        DOM.typingIndicator = document.getElementById('typingIndicator');
        DOM.uploadToggle = document.querySelector('.upload-toggle');
        DOM.fileIcon = document.getElementById('fileIcon');
        DOM.fileTitle = document.getElementById('fileTitle');
        DOM.fileDescription = document.getElementById('fileDescription');
        DOM.uploadButton = document.getElementById('uploadButton');
    },

    setupAccessibility() {
        // Atualizar aria-expanded do botão de upload
        DOM.uploadToggle.setAttribute('aria-expanded', 'false');
        
        // Adicionar labels dinâmicos
        DOM.messageInput.setAttribute('aria-label', 'Digite sua mensagem (máximo 2000 caracteres)');
        DOM.sendButton.setAttribute('aria-label', 'Enviar mensagem');
    },

    toggleUpload() {
        AppState.uploadAreaVisible = !AppState.uploadAreaVisible;
        DOM.uploadArea.classList.toggle('active', AppState.uploadAreaVisible);
        
        // Atualizar botão
        DOM.uploadToggle.textContent = AppState.uploadAreaVisible ? '❌' : '📁';
        DOM.uploadToggle.title = AppState.uploadAreaVisible ? 'Fechar upload' : 'Enviar arquivos';
        DOM.uploadToggle.setAttribute('aria-expanded', AppState.uploadAreaVisible.toString());
        
        // Focar no input se fechando
        if (!AppState.uploadAreaVisible) {
            DOM.messageInput.focus();
        }
        
        Utils.vibrate(30);
    },

    handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        // Validações
        if (!Utils.isValidFileType(file)) {
            this.showStatus('❌ Tipo de arquivo não suportado. Use PDF, TXT, DOC, DOCX, MD, JSON, CSV, XLSX ou XLS.', 'error');
            return;
        }

        if (!Utils.isValidFileSize(file)) {
            this.showStatus(`❌ Arquivo muito grande. Máximo ${Utils.formatFileSize(CONFIG.MAX_FILE_SIZE)}.`, 'error');
            return;
        }

        AppState.selectedFile = file;
        
        // Atualizar UI
        DOM.fileUpload.classList.add('has-file');
        DOM.fileIcon.textContent = '📎';
        DOM.fileTitle.textContent = file.name;
        DOM.fileDescription.textContent = `${Utils.formatFileSize(file.size)} - ${file.type || 'Tipo desconhecido'}`;
        DOM.uploadButton.disabled = false;
        
        Utils.vibrate(50);
    },

    async uploadFile(event) {
        event.stopPropagation();
        
        if (!AppState.selectedFile) {
            this.showStatus('Selecione um arquivo primeiro!', 'error');
            return;
        }

        if (AppState.isUploading) return;

        AppState.isUploading = true;
        const originalText = DOM.uploadButton.textContent;
        DOM.uploadButton.textContent = '⏳ Enviando...';
        DOM.uploadButton.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', AppState.selectedFile);
            formData.append('message', `Arquivo enviado: ${AppState.selectedFile.name}`);
            formData.append('timestamp', new Date().toISOString());
            formData.append('fileSize', AppState.selectedFile.size);
            formData.append('fileType', AppState.selectedFile.type);

            const response = await fetch(CONFIG.RAG_WEBHOOK, {
                method: 'POST',
                body: formData,
                mode: 'cors'
            });

            if (response.ok) {
                this.showStatus(`✅ Arquivo "${AppState.selectedFile.name}" enviado com sucesso! A IA agora pode usar esse conhecimento.`, 'success');
                this.resetFileUpload();
                
                // Fechar área de upload após sucesso
                setTimeout(() => {
                    this.toggleUpload();
                }, 2000);
            } else {
                throw new Error(`Erro ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showStatus(`❌ Erro ao enviar arquivo: ${error.message}`, 'error');
        } finally {
            AppState.isUploading = false;
            DOM.uploadButton.textContent = originalText;
            DOM.uploadButton.disabled = !AppState.selectedFile;
        }
    },

    resetFileUpload() {
        AppState.selectedFile = null;
        DOM.fileInput.value = '';
        DOM.fileUpload.classList.remove('has-file');
        DOM.fileIcon.textContent = '📄';
        DOM.fileTitle.textContent = 'Selecionar arquivo para RAG';
        DOM.fileDescription.textContent = 'Clique para escolher um arquivo (PDF, TXT, DOC, etc.)';
        DOM.uploadButton.disabled = true;
    },

    showStatus(message, type) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.innerHTML = Utils.sanitizeHTML(message);
        statusDiv.setAttribute('role', 'alert');
        
        DOM.uploadArea.appendChild(statusDiv);
        
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, CONFIG.STATUS_TIMEOUT);
    },

    showTyping() {
        if (AppState.isTyping) return;
        
        AppState.isTyping = true;
        DOM.typingIndicator.classList.add('active');
        this.scrollToBottom();
    },

    hideTyping() {
        AppState.isTyping = false;
        DOM.typingIndicator.classList.remove('active');
    },

    scrollToBottom() {
        setTimeout(() => {
            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        }, 100);
    },

    addMessage(content, isUser = false) {
        // Remover mensagem de boas-vindas se existir
        const welcomeMessage = DOM.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'ai'}`;
        messageDiv.setAttribute('role', 'listitem');
        
        // Processar conteúdo com markdown para mensagens da IA
        let processedContent = content;
        if (!isUser) {
            try {
                processedContent = MarkdownParser.parse(content);
            } catch (error) {
                console.warn('Erro ao processar markdown:', error);
                processedContent = content.replace(/\n/g, '<br>');
            }
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar" aria-hidden="true">${isUser ? '👤' : '🤖'}</div>
            <div class="message-content">${processedContent}</div>
        `;
        
        DOM.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Adicionar ao histórico
        AppState.conversationHistory.push({
            role: isUser ? 'user' : 'assistant',
            content: content,
            timestamp: new Date().toISOString()
        });

        // Limitar histórico
        if (AppState.conversationHistory.length > CONFIG.CONVERSATION_HISTORY_LIMIT * 2) {
            AppState.conversationHistory = AppState.conversationHistory.slice(-CONFIG.CONVERSATION_HISTORY_LIMIT);
        }
    },

    async sendMessage() {
        const message = DOM.messageInput.value.trim();
        if (!message || message.length > CONFIG.MAX_MESSAGE_LENGTH) return;

        // Adicionar mensagem do usuário
        this.addMessage(message, true);
        DOM.messageInput.value = '';
        EventManager.handleInputResize({ target: DOM.messageInput });

        // Desabilitar botão de envio
        DOM.sendButton.disabled = true;
        DOM.sendButton.textContent = '⏳';

        // Mostrar typing indicator
        this.showTyping();

        try {
            const payload = {
                message: message,
                timestamp: new Date().toISOString(),
                context: 'chat_interface',
                conversationHistory: AppState.conversationHistory.slice(-CONFIG.CONVERSATION_HISTORY_LIMIT)
            };

            const response = await fetch(CONFIG.CHAT_WEBHOOK, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                mode: 'cors'
            });

            if (response.ok) {
                const responseText = await response.text();
                let aiResponse;
                
                try {
                    const jsonResponse = JSON.parse(responseText);
                    aiResponse = jsonResponse.response || jsonResponse.message || jsonResponse.text || responseText;
                } catch {
                    aiResponse = responseText || 'Resposta recebida sem conteúdo.';
                }

                // Simular delay de digitação
                setTimeout(() => {
                    this.hideTyping();
                    this.addMessage(aiResponse);
                }, CONFIG.TYPING_DELAY);
            } else {
                const errorText = await response.text().catch(() => 'Erro desconhecido');
                throw new Error(`Erro ${response.status}: ${response.statusText} - ${errorText}`);
            }
        } catch (error) {
            console.error('Erro na conversa:', error);
            this.hideTyping();
            
            let errorMessage = '❌ Erro na comunicação com a IA.';
            
            if (error.message.includes('404')) {
                errorMessage = '❌ Webhook não encontrado. Verifique se o workflow está ativo no n8n.';
            } else if (error.message.includes('CORS')) {
                errorMessage = '❌ Erro de CORS. Configure allowedOrigins: "*" no webhook.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = '❌ Falha na conexão. Verifique se o n8n está online.';
            }
            
            this.addMessage(errorMessage);
        } finally {
            // Reabilitar botão de envio
            DOM.sendButton.disabled = false;
            DOM.sendButton.textContent = '🚀';
            DOM.messageInput.focus();
        }
    }
};

// Parser Markdown melhorado
const MarkdownParser = {
    parse(text) {
        if (!text) return '';
        
        // Escapar HTML para segurança
        text = Utils.sanitizeHTML(text);
        
        // Headers
        text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // Bold e Italic
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
        text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
        text = text.replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>');
        
        // Code
        text = text.replace(/`([^`]+?)`/g, '<code>$1</code>');
        text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Links
        text = text.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Listas
        text = text.replace(/^- (.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        text = text.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
        
        // Blockquotes
        text = text.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
        
        // Horizontal rule
        text = text.replace(/^---$/gm, '<hr>');
        
        // Parágrafos
        text = text.replace(/\n\n/g, '</p><p>');
        text = '<p>' + text + '</p>';
        
        // Limpeza
        text = text.replace(/<p><\/p>/g, '');
        text = text.replace(/<p>(<h[1-6]>)/g, '$1');
        text = text.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        text = text.replace(/<p>(<ul>|<ol>|<blockquote>|<pre>|<hr>)/g, '$1');
        text = text.replace(/(<\/ul>|<\/ol>|<\/blockquote>|<\/pre>|<hr>)<\/p>/g, '$1');
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }
};

// Inicialização da aplicação
const App = {
    init() {
        try {
            UIManager.init();
            EventManager.init();
            
            // Focar no input
            DOM.messageInput.focus();
            
            // Log de inicialização
            console.log('✅ Chat IA + RAG inicializado com sucesso!');
            console.log('📱 Dispositivo móvel:', Utils.isMobile());
            console.log('🔗 Chat Webhook:', CONFIG.CHAT_WEBHOOK);
            console.log('📁 RAG Webhook:', CONFIG.RAG_WEBHOOK);
            
            // Service Worker para PWA (opcional) - CORRIGIDO
            this.registerServiceWorker();
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    },

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // CORRIGIDO: Verificar se estamos em HTTPS ou localhost
                const isLocalhost = window.location.hostname === 'localhost' || 
                                  window.location.hostname === '127.0.0.1' ||
                                  window.location.hostname === '[::1]';
                
                const isHTTPS = window.location.protocol === 'https:';
                
                if (isHTTPS || isLocalhost) {
                    await navigator.serviceWorker.register('./sw.js');
                    console.log('✅ Service Worker registrado');
                } else {
                    console.log('⚠️ Service Worker requer HTTPS ou localhost (protocolo atual: ' + window.location.protocol + ')');
                }
            } catch (error) {
                console.log('⚠️ Service Worker não disponível:', error.message);
            }
        } else {
            console.log('⚠️ Service Worker não suportado neste navegador');
        }
    }
};

// CORRIGIDO: Expor funções globais com referências corretas
window.toggleUpload = () => UIManager.toggleUpload();
window.handleFileSelect = (input) => UIManager.handleFileSelect(input);
window.uploadFile = (event) => UIManager.uploadFile(event);
window.sendMessage = () => UIManager.sendMessage();
window.handleKeyPress = (event) => EventManager.handleKeyPress(event);
window.autoResize = (textarea) => EventManager.handleInputResize({ target: textarea });

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}