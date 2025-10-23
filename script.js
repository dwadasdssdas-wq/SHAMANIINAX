class ShamanAI {
    constructor() {
        this.history = [];
        this.isListening = false;
        this.aiMode = 'smart';
        this.requestCount = 0;
        this.cache = new Map();
        
        this.initParticles();
        this.initEventListeners();
        this.showWelcomeEffects();
        this.testAIConnection();
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

        handwritingBtn.addEventListener('click', () => this.openUploadModal());
        closeModal.addEventListener('click', () => this.closeUploadModal());
        handwritingInput.addEventListener('change', (e) => this.handleHandwritingUpload(e));

        window.addEventListener('click', (e) => {
            if (e.target === uploadModal) {
                this.closeUploadModal();
            }
        });
    }

    async testAIConnection() {
        this.addSystemMessage("Проверяю подключение к AI...");
        
        try {
            const response = await this.makeAIRequest('Привет!', 'chat');
            this.updateAIStatus(true);
            this.addSystemMessage("AI подключен и готов к работе!");
        } catch (error) {
            console.error('AI connection failed:', error);
            this.updateAIStatus(false);
            this.addSystemMessage("AI временно недоступен. Используется локальный режим.");
        }
    }

    updateAIStatus(isActive) {
        const aiStatus = document.querySelector('.ai-status');
        const apiStatus = document.querySelector('.api-status');
        
        if (isActive) {
            aiStatus.innerHTML = `
                <span class="ai-dot active"></span>
                <span class="ai-text">AI активен</span>
            `;
            apiStatus.innerHTML = `
                <span class="status-message">AI Connected</span>
            `;
        } else {
            aiStatus.innerHTML = `
                <span class="ai-dot" style="background: #6B7280;"></span>
                <span class="ai-text" style="color: #6B7280;">Локальный режим</span>
            `;
            apiStatus.innerHTML = `
                <span class="status-message">Local Mode</span>
            `;
        }
    }

    async makeAIRequest(userMessage, modelType = 'chat') {
        const cacheKey = `${modelType}_${userMessage.substring(0, 50)}`;
        
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            let response;
            
            switch(modelType) {
                case 'chat':
                    response = await this.chatWithAI(userMessage);
                    break;
                case 'handwriting':
                    response = "Готов к распознаванию почерка";
                    break;
                case 'math':
                    response = await this.handleMathWithAI(userMessage);
                    break;
                default:
                    response = await this.chatWithAI(userMessage);
            }
            
            this.cache.set(cacheKey, response);
            return response;
        } catch (error) {
            console.error('AI error:', error);
            throw new Error('Ошибка подключения к AI');
        }
    }

    async chatWithAI(userMessage) {
        const API_URL = SHAMAN_AI_CONFIG.API_URLS.HUGGING_FACE + SHAMAN_AI_CONFIG.MODELS.CHAT;
        
        const prompt = `Ты - ShamanAI, продвинутый AI помощник. Ты помогаешь пользователям с различными задачами, включая образование, программирование, математику, физику, химию, а также ведешь светские беседы. Отвечай точно и ясно, без использования эмодзи.

Пользователь: ${userMessage}
ShamanAI:`;

        try {
            const response = await axios.post(API_URL, {
                inputs: prompt,
                parameters: {
                    max_length: 500,
                    temperature: this.aiMode === 'smart' ? 0.7 : 0.3,
                    repetition_penalty: 1.2,
                    do_sample: true
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${SHAMAN_AI_CONFIG.HUGGING_FACE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (response.data && response.data[0] && response.data[0].generated_text) {
                let generatedText = response.data[0].generated_text;
                generatedText = generatedText.replace(prompt, '').trim();
                generatedText = generatedText.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
                return generatedText;
            } else {
                return this.generateLocalResponse(userMessage);
            }
        } catch (error) {
            console.warn('AI API недоступен, используем локальный режим');
            return this.generateLocalResponse(userMessage);
        }
    }

    async handleMathWithAI(question) {
        const mathPrompt = `Ты - AI помощник по математике. Ответь точно и понятно на вопрос: ${question}. Объясни шаги решения.`;
        return await this.chatWithAI(mathPrompt);
    }

    async recognizeHandwriting(imageFile) {
        const API_URL = SHAMAN_AI_CONFIG.API_URLS.HUGGING_FACE + SHAMAN_AI_CONFIG.MODELS.HANDWRITING;
        
        try {
            const formData = new FormData();
            formData.append('file', imageFile);

            const response = await axios.post(API_URL, formData, {
                headers: {
                    'Authorization': `Bearer ${SHAMAN_AI_CONFIG.HUGGING_FACE_TOKEN}`,
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 45000
            });

            if (response.data && response.data.text) {
                return `Распознанный текст: "${response.data.text}"`;
            } else {
                return "Не удалось распознать текст. Попробуйте другое изображение.";
            }
        } catch (error) {
            console.error('OCR Error:', error);
            return "Ошибка распознавания. Проверьте подключение или попробуйте позже.";
        }
    }

    async handleUserInput() {
        const userInput = document.getElementById('userInput');
        const inputText = userInput.value.trim();
        
        if (!inputText) return;

        this.addMessage(inputText, 'user');
        userInput.value = '';
        this.showThinkingIndicator();

        try {
            let modelType = 'chat';
            if (this.isMathQuestion(inputText)) {
                modelType = 'math';
            }

            const response = await this.makeAIRequest(inputText, modelType);
            
            this.hideThinkingIndicator();
            this.addMessage(response, 'ai');
            this.addToHistory(inputText, response);
            this.updateRequestCount();
            
        } catch (error) {
            this.hideThinkingIndicator();
            console.error('Error:', error);
            const fallbackResponse = this.generateLocalResponse(inputText);
            this.addMessage(fallbackResponse, 'ai');
            this.addSystemMessage("Используется локальная обработка запроса");
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

        if (!file.type.startsWith('image/')) {
            this.addSystemMessage("Пожалуйста, загрузите изображение");
            return;
        }

        this.addMessage(`Загружено изображение: ${file.name}`, 'user');
        this.showThinkingIndicator();
        
        try {
            const recognitionResult = await this.recognizeHandwriting(file);
            this.hideThinkingIndicator();
            this.addMessage(recognitionResult, 'ai');
            this.updateRequestCount();
            
            if (this.containsMath(recognitionResult)) {
                this.addMessage("Нашел математическую задачу! Хотите, чтобы я её решил?", 'ai');
            }
        } catch (error) {
            this.hideThinkingIndicator();
            this.addMessage("Ошибка при обработке изображения", 'ai');
        }

        this.closeUploadModal();
        event.target.value = '';
    }

    containsMath(text) {
        const mathPatterns = [/[\d+\-*/=]/, /уравнение/, /реши/, /посчитай/, /задача/];
        return mathPatterns.some(pattern => pattern.test(text.toLowerCase()));
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
        this.addMessage("Задайте вопрос по физике...", 'user');
        setTimeout(async () => {
            const response = await this.makeAIRequest("Объясни концепцию из физики для школьников: законы Ньютона", 'chat');
            this.addMessage(response, 'ai');
        }, 100);
    }

    async handleChemistryQuestion() {
        this.addMessage("Задайте вопрос по химии...", 'user');
        setTimeout(async () => {
            const response = await this.makeAIRequest("Объясни основы химических реакций для школьников", 'chat');
            this.addMessage(response, 'ai');
        }, 100);
    }

    showGraphBuilder() {
        const functionStr = prompt('Введите функцию для построения графика (например: x^2, sin(x), 1/x):', 'x^2');
        if (functionStr) {
            this.plotFunction(functionStr, `График y = ${functionStr}`);
            this.addMessage(`Построение графика функции: y = ${functionStr}`, 'ai');
        }
    }

    showGeometryHelper() {
        this.addMessage("Запускаю геометрический помощник... Опишите задачу, и я построю чертеж!", 'ai');
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
                this.addMessage("Решите уравнение: x² - 5x + 6 = 0", 'user');
                setTimeout(async () => {
                    const response = await this.makeAIRequest("Реши уравнение: x² - 5x + 6 = 0. Объясни шаги решения.", 'math');
                    this.addMessage(response, 'ai');
                }, 1000);
            },
            example_geometry: () => {
                this.addMessage("Найдите площадь треугольника со сторонами 5, 6, 7", 'user');
                setTimeout(async () => {
                    const response = await this.makeAIRequest("Найди площадь треугольника со сторонами 5, 6, 7. Объясни решение.", 'math');
                    this.addMessage(response, 'ai');
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

    openUploadModal() {
        document.getElementById('uploadModal').style.display = 'block';
    }

    closeUploadModal() {
        document.getElementById('uploadModal').style.display = 'none';
    }

    showWelcomeEffects() {
        setTimeout(() => {
            this.addSystemMessage("ShamanAI инициализирован");
        }, 500);
    }

    showThinkingIndicator() {
        const chatOutput = document.getElementById('chatOutput');
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'message ai-message thinking-animation';
        thinkingDiv.id = 'thinkingIndicator';
        thinkingDiv.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <span class="thinking-text">ShamanAI обрабатывает запрос</span>
                <div class="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
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

    generateLocalResponse(input) {
        const lowerInput = input.toLowerCase();
        
        if (lowerInput.includes('график') || lowerInput.includes('функция')) {
            return this.handleMathRequest(input);
        } else if (lowerInput.includes('геометрия') || lowerInput.includes('треугольник')) {
            return this.handleGeometryRequest(input);
        } else if (lowerInput.includes('физика') || lowerInput.includes('схема')) {
            return this.handlePhysicsRequest(input);
        } else if (lowerInput.includes('химия') || lowerInput.includes('реакция')) {
            return this.handleChemistryRequest(input);
        } else {
            const responses = [
                "Интересный вопрос! В текущем режиме я специализируюсь на учебных задачах.",
                "ShamanAI лучше всего справляется с точными науками.",
                "Совет: используйте кнопки быстрых команд для доступа к инструментам."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    handleMathRequest(input) {
        if (input.includes('гипербола') || input.includes('гипербол')) {
            this.plotFunction('1/x', 'Гипербола y = 1/x');
            return 'Строю график гиперболы y = 1/x. Гипербола - функция обратной пропорциональности';
        } else if (input.includes('парабола') || input.includes('квадрат')) {
            this.plotFunction('x^2', 'Парабола y = x²');
            return 'Строю график параболы y = x². Парабола - график квадратичной функции';
        } else {
            return 'Я могу построить графики функций! Используйте кнопку "Построить график"';
        }
    }

    handleGeometryRequest(input) {
        this.drawInteractiveGeometry();
        return 'Решаю геометрическую задачу. На основе описания строю схематический чертеж.';
    }

    handlePhysicsRequest(input) {
        return 'Для задач по физике я могу строить электрические схемы, диаграммы сил. Опишите задачу подробнее.';
    }

    handleChemistryRequest(input) {
        return 'Для химических задач я могу рисовать структурные формулы, схемы реакций. Опишите вашу задачу.';
    }

    addSystemMessage(text) {
        const chatOutput = document.getElementById('chatOutput');
        const systemDiv = document.createElement('div');
        systemDiv.className = 'system-message';
        systemDiv.textContent = text;
        chatOutput.appendChild(systemDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    addMessage(text, sender) {
        const chatOutput = document.getElementById('chatOutput');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        if (sender === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-avatar">AI</div>
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

document.addEventListener('DOMContentLoaded', () => {
    window.shamanAI = new ShamanAI();
});
