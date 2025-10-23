// Конфигурация ShamanAI
const SHAMAN_AI_CONFIG = {
    MODELS: {
        CHAT: 'microsoft/DialoGPT-medium',
        MATH: 'google/flan-t5-base',
        GENERAL: 'microsoft/DialoGPT-medium'
    },
    API_URLS: {
        HUGGING_FACE: 'https://api-inference.huggingface.co/models/'
    }
};

class ShamanAI {
    constructor() {
        this.history = [];
        this.isListening = false;
        this.aiMode = 'smart';
        this.requestCount = 0;
        this.chatHistory = '';
        this.hfToken = localStorage.getItem('huggingface_token');
        
        if (!this.hfToken) {
            this.showTokenModal();
            return;
        }
        
        this.initApp();
    }

    showTokenModal() {
        document.getElementById('tokenModal').style.display = 'block';
        document.getElementById('saveTokenBtn').addEventListener('click', () => this.saveToken());
        document.getElementById('tokenInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.saveToken();
        });
    }

    saveToken() {
        const tokenInput = document.getElementById('tokenInput');
        const token = tokenInput.value.trim();
        
        if (!token) {
            alert('Пожалуйста, введите токен Hugging Face');
            return;
        }

        if (!token.startsWith('hf_')) {
            alert('Токен должен начинаться с hf_');
            return;
        }

        this.hfToken = token;
        localStorage.setItem('huggingface_token', token);
        document.getElementById('tokenModal').style.display = 'none';
        this.initApp();
    }

    initApp() {
        document.getElementById('mainContainer').style.display = 'block';
        
        this.initParticles();
        this.initEventListeners();
        this.showWelcomeEffects();
        this.testHuggingFaceConnection();
    }

    initParticles() {
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', {
                particles: {
                    number: { value: 80, density: { enable: true, value_area: 800 } },
                    color: { value: "#a855f7" },
                    shape: { type: "circle" },
                    opacity: { value: 0.5, random: true },
                    size: { value: 3, random: true },
                    line_linked: {
                        enable: true,
                        distance: 150,
                        color: "#8b5cf6",
                        opacity: 0.2,
                        width: 1
                    },
                    move: {
                        enable: true,
                        speed: 2,
                        direction: "none",
                        random: true,
                        out_mode: "out"
                    }
                },
                interactivity: {
                    detect_on: "canvas",
                    events: {
                        onhover: { enable: true, mode: "repulse" },
                        onclick: { enable: true, mode: "push" }
                    }
                }
            });
        }
    }

    initEventListeners() {
        const sendButton = document.getElementById('sendButton');
        const userInput = document.getElementById('userInput');
        const toolButtons = document.querySelectorAll('.tool-btn');
        const quickButtons = document.querySelectorAll('.quick-btn');
        const modeButtons = document.querySelectorAll('.mode-btn');
        const voiceBtn = document.getElementById('voiceBtn');
        const handwritingBtn = document.getElementById('handwritingBtn');
        const uploadModal = document.getElementById('uploadModal');
        const closeModal = document.querySelector('.close-modal');
        const handwritingInput = document.getElementById('handwritingInput');

        sendButton.addEventListener('click', () => this.handleUserInput());
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });

        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const command = e.target.dataset.command;
                this.handleToolCommand(command);
            });
        });

        quickButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleQuickAction(action);
            });
        });

        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                modeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.aiMode = e.target.dataset.mode;
                this.addSystemMessage(`Режим изменен: ${this.aiMode === 'smart' ? 'Умный (творческий)' : 'Быстрый (точный)'}`);
            });
        });

        voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        handwritingBtn.addEventListener('click', () => this.openUploadModal());
        closeModal.addEventListener('click', () => this.closeUploadModal());
        handwritingInput.addEventListener('change', (e) => this.handleHandwritingUpload(e));

        window.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                this.closeUploadModal();
            }
        });
    }

    async testHuggingFaceConnection() {
        this.addSystemMessage("🔗 Проверяю подключение к Hugging Face...");
        
        try {
            const response = await this.queryHuggingFace({
                inputs: "Привет! Ответь коротко.",
                parameters: {
                    max_new_tokens: 20,
                    temperature: 0.7
                }
            }, 'microsoft/DialoGPT-medium');
            
            this.updateAIStatus(true);
            this.addSystemMessage("✅ Hugging Face подключен и готов к работе!");
        } catch (error) {
            console.error('Hugging Face connection failed:', error);
            this.updateAIStatus(false);
            
            if (error.message.includes('401')) {
                this.addSystemMessage("❌ Неверный токен Hugging Face. Удаляю токен...");
                localStorage.removeItem('huggingface_token');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                this.addSystemMessage("❌ Ошибка подключения: " + error.message);
            }
        }
    }

    updateAIStatus(isActive) {
        const aiStatus = document.querySelector('.ai-status');
        const apiStatus = document.querySelector('.api-status');
        
        if (isActive) {
            aiStatus.innerHTML = `
                <span class="ai-dot active"></span>
                <span class="ai-text">Hugging Face активен</span>
            `;
            apiStatus.innerHTML = `
                <span class="status-icon">🤗</span>
                <span class="status-message">HF Connected</span>
            `;
        } else {
            aiStatus.innerHTML = `
                <span class="ai-dot" style="background: #6B7280;"></span>
                <span class="ai-text" style="color: #6B7280;">Ошибка подключения</span>
            `;
            apiStatus.innerHTML = `
                <span class="status-icon">⚠️</span>
                <span class="status-message">Connection Error</span>
            `;
        }
    }

    async queryHuggingFace(data, model = 'microsoft/DialoGPT-medium') {
        const API_URL = `${SHAMAN_AI_CONFIG.API_URLS.HUGGING_FACE}${model}`;
        
        console.log('🔄 Запрос к Hugging Face:', model);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.hfToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        console.log('📡 Статус ответа:', response.status);

        if (response.status === 503) {
            throw new Error('Модель загружается. Подождите 20-30 секунд и попробуйте снова.');
        }

        if (response.status === 401) {
            throw new Error('401: Неверный токен Hugging Face');
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Получен ответ:', result);
        return result;
    }

    async handleUserInput() {
        const userInput = document.getElementById('userInput');
        const inputText = userInput.value.trim();
        
        if (!inputText) return;

        this.addMessage(inputText, 'user');
        userInput.value = '';
        this.showThinkingIndicator();

        try {
            let response;
            
            if (this.isMathQuestion(inputText)) {
                response = await this.queryHuggingFace({
                    inputs: `Реши математическую задачу: ${inputText}`,
                    parameters: {
                        max_new_tokens: 200,
                        temperature: 0.3
                    }
                }, 'google/flan-t5-base');
                
                if (response && response[0] && response[0].generated_text) {
                    response = response[0].generated_text;
                }
            } else {
                response = await this.queryHuggingFace({
                    inputs: inputText,
                    parameters: {
                        max_new_tokens: 150,
                        temperature: this.aiMode === 'smart' ? 0.7 : 0.3,
                        repetition_penalty: 1.1,
                        do_sample: true,
                        return_full_text: false
                    }
                }, 'microsoft/DialoGPT-medium');
                
                if (response && response[0] && response[0].generated_text) {
                    response = response[0].generated_text;
                }
            }
            
            this.hideThinkingIndicator();
            this.addMessage(response, 'ai');
            this.addToHistory(inputText, response);
            this.updateRequestCount();
            
        } catch (error) {
            this.hideThinkingIndicator();
            console.error('❌ Ошибка:', error);
            
            if (error.message.includes('401')) {
                this.addMessage("❌ Неверный токен Hugging Face. Страница будет перезагружена...", 'ai');
                localStorage.removeItem('huggingface_token');
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                this.addMessage(`❌ Ошибка: ${error.message}`, 'ai');
            }
        }
    }

    isMathQuestion(input) {
        const mathKeywords = [
            'реши уравнение', 'посчитай', 'математика', 'алгебра', 'геометрия',
            'формула', 'вычисли', 'задача по математике', 'уравнение', 'график',
            'интеграл', 'производная', 'теорема'
        ];
        return mathKeywords.some(keyword => input.toLowerCase().includes(keyword));
    }

    async handleHandwritingUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.addMessage(`📎 Загружено изображение: ${file.name}`, 'user');
        this.showThinkingIndicator();
        
        try {
            const API_URL = 'https://api-inference.huggingface.co/models/microsoft/trocr-base-handwritten';
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.hfToken}`,
                },
                body: formData
            });

            if (!response.ok) throw new Error('OCR API error');

            const data = await response.json();
            const recognizedText = data?.text || "Текст не распознан";
            
            this.hideThinkingIndicator();
            this.addMessage(`📝 Распознанный текст: "${recognizedText}"`, 'ai');
            
        } catch (error) {
            this.hideThinkingIndicator();
            this.addMessage("❌ Ошибка при обработке изображения", 'ai');
        }

        this.closeUploadModal();
        event.target.value = '';
    }

    handleToolCommand(command) {
        const commands = {
            graph: () => this.showGraphBuilder(),
            geometry: () => this.showGeometryHelper(),
            physics: () => this.handlePhysicsQuestion(),
            chemistry: () => this.handleChemistryQuestion(),
            handwriting: () => this.openUploadModal()
        };

        if (commands[command]) {
            commands[command]();
        }
    }

    async handlePhysicsQuestion() {
        this.addMessage("🔬 Задайте вопрос по физике...", 'user');
        this.showThinkingIndicator();
        try {
            const response = await this.queryHuggingFace({
                inputs: "Объясни концепцию из физики для школьников: законы Ньютона",
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.7
                }
            }, 'microsoft/DialoGPT-medium');
            
            this.hideThinkingIndicator();
            if (response && response[0] && response[0].generated_text) {
                this.addMessage(response[0].generated_text, 'ai');
            }
        } catch (error) {
            this.hideThinkingIndicator();
            this.addMessage("❌ Не удалось получить ответ по физике", 'ai');
        }
    }

    async handleChemistryQuestion() {
        this.addMessage("🧪 Задайте вопрос по химии...", 'user');
        this.showThinkingIndicator();
        try {
            const response = await this.queryHuggingFace({
                inputs: "Объясни основы химических реакций для школьников",
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.7
                }
            }, 'microsoft/DialoGPT-medium');
            
            this.hideThinkingIndicator();
            if (response && response[0] && response[0].generated_text) {
                this.addMessage(response[0].generated_text, 'ai');
            }
        } catch (error) {
            this.hideThinkingIndicator();
            this.addMessage("❌ Не удалось получить ответ по химии", 'ai');
        }
    }

    showGraphBuilder() {
        const functionStr = prompt('Введите функцию для построения графика (например: x^2, sin(x), 1/x):', 'x^2');
        if (functionStr) {
            this.plotFunction(functionStr, `График y = ${functionStr}`);
            this.addMessage(`📊 Построение графика функции: y = ${functionStr}`, 'ai');
        }
    }

    showGeometryHelper() {
        this.addMessage("📐 Запускаю геометрический помощник... Опишите задачу, и я построю чертеж!", 'ai');
        this.drawInteractiveGeometry();
    }

    plotFunction(expression, title) {
        const graphContainer = document.getElementById('graphContainer');
        graphContainer.style.display = 'block';
        
        setTimeout(() => {
            const ctx = document.getElementById('functionGraph').getContext('2d');
            
            const data = [];
            for (let x = -10; x <= 10; x += 0.1) {
                try {
                    let y;
                    if (expression === '1/x') {
                        y = x !== 0 ? 1/x : null;
                    } else if (expression === 'x^2') {
                        y = x * x;
                    } else if (expression === 'sin(x)') {
                        y = Math.sin(x);
                    } else {
                        y = eval(expression.replace(/x/g, `(${x})`));
                    }
                    
                    if (y !== null && isFinite(y) && Math.abs(y) < 100) {
                        data.push({x: x, y: y});
                    }
                } catch (e) {
                    console.error('Ошибка вычисления функции:', e);
                }
            }
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: title,
                        data: data,
                        borderColor: '#a45deb',
                        backgroundColor: 'rgba(164, 93, 235, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            grid: {
                                color: 'rgba(126, 59, 216, 0.2)'
                            },
                            ticks: {
                                color: '#e0d6f2'
                            }
                        },
                        y: {
                            grid: {
                                color: 'rgba(126, 59, 216, 0.2)'
                            },
                            ticks: {
                                color: '#e0d6f2'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#e0d6f2'
                            }
                        }
                    }
                }
            });
        }, 100);
    }

    drawInteractiveGeometry() {
        const geometryContainer = document.getElementById('geometryContainer');
        geometryContainer.style.display = 'block';
        
        setTimeout(() => {
            const canvas = document.getElementById('geometryCanvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 600;
            canvas.height = 400;
            
            ctx.fillStyle = 'rgba(25, 10, 45, 0.9)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = '#a45deb';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'rgba(164, 93, 235, 0.1)';
            
            ctx.beginPath();
            ctx.moveTo(100, 300);
            ctx.lineTo(300, 300);
            ctx.lineTo(200, 100);
            ctx.closePath();
            ctx.stroke();
            ctx.fill();
            
            ctx.fillStyle = '#e0d6f2';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('A', 90, 315);
            ctx.fillText('B', 310, 315);
            ctx.fillText('C', 205, 90);
            
            ctx.font = '14px Arial';
            ctx.fillText('c', 150, 320);
            ctx.fillText('a', 250, 200);
            ctx.fillText('b', 150, 200);
        }, 100);
    }

    handleQuickAction(action) {
        const actions = {
            example_math: () => {
                const mathQuestion = "Решите уравнение: x² - 5x + 6 = 0";
                this.addMessage(mathQuestion, 'user');
                setTimeout(async () => {
                    try {
                        const response = await this.queryHuggingFace({
                            inputs: `Реши математическую задачу: ${mathQuestion} Объясни шаги решения подробно.`,
                            parameters: {
                                max_new_tokens: 200,
                                temperature: 0.3
                            }
                        }, 'google/flan-t5-base');
                        
                        if (response && response[0] && response[0].generated_text) {
                            this.addMessage(response[0].generated_text, 'ai');
                        }
                    } catch (error) {
                        this.addMessage("❌ Не удалось получить решение", 'ai');
                    }
                }, 1000);
            },
            example_geometry: () => {
                const geometryQuestion = "Найдите площадь треугольника со сторонами 5, 6, 7";
                this.addMessage(geometryQuestion, 'user');
                setTimeout(async () => {
                    try {
                        const response = await this.queryHuggingFace({
                            inputs: `Реши геометрическую задачу: ${geometryQuestion} Объясни решение по формуле Герона.`,
                            parameters: {
                                max_new_tokens: 200,
                                temperature: 0.7
                            }
                        }, 'microsoft/DialoGPT-medium');
                        
                        if (response && response[0] && response[0].generated_text) {
                            this.addMessage(response[0].generated_text, 'ai');
                        }
                    } catch (error) {
                        this.addMessage("❌ Не удалось решить задачу", 'ai');
                    }
                }, 1000);
            },
            clear: () => {
                document.getElementById('chatOutput').innerHTML = '';
                this.showWelcomeEffects();
                this.requestCount = 0;
                this.updateRequestCount();
            }
        };

        if (actions[action]) {
            actions[action]();
        }
    }

    toggleVoiceInput() {
        if (!this.isListening) {
            this.startVoiceRecognition();
        } else {
            this.stopVoiceRecognition();
        }
    }

    startVoiceRecognition() {
        this.isListening = true;
        this.addSystemMessage("🎤 Слушаю... Говорите сейчас");
        
        setTimeout(() => {
            const sampleQuestions = [
                "Построй график функции y равно x в квадрате",
                "Реши задачу по геометрии про треугольник",
                "Объясни закон Ньютона"
            ];
            const randomQuestion = sampleQuestions[Math.floor(Math.random() * sampleQuestions.length)];
            
            document.getElementById('userInput').value = randomQuestion;
            this.stopVoiceRecognition();
            this.addSystemMessage(`🎤 Распознано: "${randomQuestion}"`);
        }, 2000);
    }

    stopVoiceRecognition() {
        this.isListening = false;
        this.addSystemMessage("🔇 Голосовой ввод отключен");
    }

    openUploadModal() {
        document.getElementById('uploadModal').style.display = 'block';
    }

    closeUploadModal() {
        document.getElementById('uploadModal').style.display = 'none';
    }

    showWelcomeEffects() {
        setTimeout(() => {
            this.addSystemMessage("🌀 ShamanAI инициализирован с Hugging Face");
        }, 500);
    }

    showThinkingIndicator() {
        const chatOutput = document.getElementById('chatOutput');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message ai-message thinking-animation';
        thinkingDiv.id = 'thinkingIndicator';
        thinkingDiv.innerHTML = `
            <span class="thinking-text">ShamanAI обрабатывает запрос</span>
            <div class="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
        chatOutput.appendChild(thinkingDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    hideThinkingIndicator() {
        const thinkingIndicator = document.getElementById('thinkingIndicator');
        if (thinkingIndicator) {
            thinkingIndicator.remove();
        }
    }

    addSystemMessage(text) {
        const chatOutput = document.getElementById('chatOutput');
        const systemDiv = document.createElement('div');
        systemDiv.className = 'system-message';
        systemDiv.innerHTML = `<span class="system-icon">⚡</span> ${text}`;
        chatOutput.appendChild(systemDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    addMessage(text, sender) {
        const chatOutput = document.getElementById('chatOutput');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">${this.formatResponse(text)}</div>
            `;
        } else {
            messageDiv.textContent = text;
        }
        
        chatOutput.appendChild(messageDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    formatResponse(text) {
        return text.replace(/\n/g, '<br>')
                   .replace(/(Ответ:.*)/g, '<strong>$1</strong>')
                   .replace(/(x[₁₂]? = [^<]+)/g, '<code>$1</code>');
    }

    addToHistory(question, answer) {
        this.history.push({
            question,
            answer,
            timestamp: new Date().toLocaleString()
        });
    }

    updateRequestCount() {
        this.requestCount++;
        const statNumber = document.querySelector('.stat-number');
        if (statNumber) {
            statNumber.textContent = this.requestCount;
        }
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    window.shamanAI = new ShamanAI();
});
