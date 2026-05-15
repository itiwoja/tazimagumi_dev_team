// --- ダークモード＆刀アクション ---
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
            for(let i=1; i<=5; i++) {
                const checked = localStorage.getItem(`task${i}`);
                if(checked === 'true') document.getElementById(`task${i}`).checked = true;
            }
        });
        function saveTasks() {
            for(let i=1; i<=5; i++) {
                localStorage.setItem(`task${i}`, document.getElementById(`task${i}`).checked);
            }
        }
        function resetTasks() {
            for(let i=1; i<=5; i++) {
                document.getElementById(`task${i}`).checked = false;
                localStorage.removeItem(`task${i}`);
            }
            alert("記録を白紙に戻した。明日も気合入れろ。");
        }

        // --- チャットシステム ---
        const chatBody = document.getElementById('chat-body');
        const chatOptions = document.getElementById('chat-options');

        const botData = {
            'skin': { user: "アブラと乾燥でツラが汚ねぇ。", bot: "『泥炭濃密泡洗顔』で汚れを落とし、保湿液を叩き込め。", img: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=100&q=80", name: "泥炭洗顔＆保湿" },
            'sun': { user: "日差しで老け込みそうだ。", bot: "無防備すぎるぞ。『鋼鉄UVシールド』で盾を張れ。", img: "https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=100&q=80", name: "鋼鉄UVシールド" },
            'hair': { user: "威圧感のある髪型にキメてぇ。", bot: "『極艶ポマード』か、新しく入れた『マットワックス』を使え。狂犬みたいなオーラが出るぜ。", img: "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?auto=format&fit=crop&w=100&q=80", name: "無骨クレイマットワックス" },
            'shave': { user: "髭剃り負けで血を見るんです。", bot: "『五枚刃』で剃った後、追加した『アフターシェーブ』で冷却しろ。ヒリつきが引くぞ。", img: "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=100&q=80", name: "鎮痛アフターシェーブ" },
            'adult': { user: "下半身が暴走しそうです。", bot: "外でヘタ打つな。『殿方慰み極上筒』と『極潤・秘伝油』で、部屋で静かにケジメをつけろ。", img: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=100&q=80", name: "極潤・夜の秘伝油" }
        };

        function selectOption(key) {
            const data = botData[key];
            chatOptions.style.display = 'none';
            appendMessage('msg-user', data.user);
            setTimeout(() => {
                const botHtml = `${data.bot}<div class="bot-product-card"><img src="${data.img}"><div style="font-size: 14px; font-weight:bold;">${data.name}</div></div>`;
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
            btn.className = 'btn-option'; btn.style.textAlign = 'center'; btn.innerText = '他の悩みも相談する';
            btn.onclick = () => { btn.remove(); chatOptions.style.display = 'flex'; appendMessage('msg-bot', '他に吐きたいことはあるか？'); };
            chatBody.appendChild(btn); chatBody.scrollTop = chatBody.scrollHeight;
        }

        // --- 横殴りの桜アニメーション ---
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
        for(let i=0; i<40; i++) { createPetal(); }
        setInterval(createPetal, 150);

