// --- テーマ切り替え ---
        function toggleTheme() {
            const slash = document.getElementById('slash');
            slash.classList.remove('slash-active');
            void slash.offsetWidth; 
            slash.classList.add('slash-active');

            setTimeout(() => {
                const body = document.documentElement;
                if(body.getAttribute('data-theme') === 'dark') {
                    body.setAttribute('data-theme', 'light');
                } else {
                    body.setAttribute('data-theme', 'dark');
                }
            }, 300); 
        }

        // --- 管理システム ---
        document.addEventListener('DOMContentLoaded', () => {
            for(let i=1; i<=4; i++) {
                const checked = localStorage.getItem(`task${i}`);
                if(checked === 'true') document.getElementById(`task${i}`).checked = true;
            }
        });
        function saveTasks() {
            for(let i=1; i<=4; i++) {
                localStorage.setItem(`task${i}`, document.getElementById(`task${i}`).checked);
            }
        }
        function resetTasks() {
            for(let i=1; i<=4; i++) {
                document.getElementById(`task${i}`).checked = false;
                localStorage.removeItem(`task${i}`);
            }
            alert("記録をリセットしました。");
        }

        // --- チャットシステム ---
        const chatBody = document.getElementById('chat-body');
        const chatOptions = document.getElementById('chat-options');

        const botData = {
            'skin': { user: "皮脂と乾燥が気になる", bot: "洗顔で肌を清潔にし、保湿液でうるおいを与える流れから確認しましょう。", img: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=100&q=80", name: "泡洗顔＆保湿液" },
            'sun': { user: "日差し対策を始めたい", bot: "外出前に使いやすい軽い使用感の日焼け止め候補を確認しましょう。", img: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=100&q=80", name: "軽量UVジェル" },
            'hair': { user: "髪型を整えたい", bot: "ツヤを出すポマードか、自然に仕上げるマットワックスから比較しましょう。", img: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?auto=format&fit=crop&w=100&q=80", name: "クレイマットワックス" },
            'shave': { user: "髭剃り後のケアを見直したい", bot: "髭剃り後に使う候補と、タイミングを選ぶ成分の有無を確認しましょう。", img: "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=100&q=80", name: "アフターシェーブローション" }
        };

        function selectOption(key) {
            const data = botData[key];
            chatOptions.style.display = 'none';
            appendMessage('msg-user', data.user);
            setTimeout(() => {
                const botHtml = `${data.bot}<div class="bot-product-card"><img src="${data.img}" alt=""><div class="bot-product-name">${data.name}</div></div>`;
                appendMessage('msg-bot', botHtml);
                showResetButton();
            }, 800);
        }
        function appendMessage(cls, html) {
            const div = document.createElement('div');
            div.className = `chat-msg ${cls}`; div.innerHTML = html;
            chatBody.appendChild(div); chatBody.scrollTop = chatBody.scrollHeight;
        }
        function showResetButton() {
            const btn = document.createElement('button');
            btn.className = 'btn-option'; btn.style.textAlign = 'center'; btn.innerText = '他の悩みも見る';
            btn.onclick = () => { btn.remove(); chatOptions.style.display = 'flex'; appendMessage('msg-bot', '他にも整理したい悩みはありますか？'); };
            chatBody.appendChild(btn); chatBody.scrollTop = chatBody.scrollHeight;
        }

        // --- 背景アニメーション ---
        const sakuraContainer = document.getElementById('sakura-container');
        const createPetal = () => {
            const petal = document.createElement('div');
            petal.classList.add('petal');
            const size = Math.random() * 8 + 12; 
            const top = Math.random() * 100; 
            const left = Math.random() * -50; 
            const duration = Math.random() * 4 + 4; 
            petal.style.width = `${size}px`; petal.style.height = `${size}px`;
            petal.style.top = `${top}vh`; petal.style.left = `${left}vw`; 
            petal.style.animationDuration = `${duration}s`;
            sakuraContainer.appendChild(petal);
            setTimeout(() => { petal.remove(); }, duration * 1000);
        };
        for(let i=0; i<24; i++) { createPetal(); }
        setInterval(createPetal, 150);

