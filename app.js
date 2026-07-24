// === 資料庫設定 ===
const stars = {
    "天醫": { levels: { "1級": ["13","31"], "2級": ["68","86"], "3級": ["49","94"], "4級": ["27","72"] }, type: "吉" },
    "生氣": { levels: { "1級": ["14","41"], "2級": ["67","76"], "3級": ["39","93"], "4級": ["28","82"] }, type: "吉" },
    "延年": { levels: { "1級": ["19","91"], "2級": ["78","87"], "3級": ["34","43"], "4級": ["26","62"] }, type: "吉" },
    "伏位": { levels: { "1級": ["11","22"], "2級": ["88","99"], "3級": ["66","77"], "4級": ["33","44"] }, type: "吉" },
    "絕命": { levels: { "1級": ["12","21"], "2級": ["69","96"], "3級": ["48","84"], "4級": ["37","73"] }, type: "凶" },
    "五鬼": { levels: { "1級": ["18","81"], "2級": ["79","97"], "3級": ["36","63"], "4級": ["24","42"] }, type: "凶" },
    "六煞": { levels: { "1級": ["16","61"], "2級": ["47","74"], "3級": ["38","83"], "4級": ["29","92"] }, type: "凶" },
    "禍害": { levels: { "1級": ["17","71"], "2級": ["89","98"], "3級": ["46","64"], "4級": ["23","32"] }, type: "凶" }
};

const letterMap = {
    'A':1, 'B':2, 'C':3, 'D':4, 'E':5, 'F':6, 'G':7, 'H':8, 'I':9,
    'J':1, 'K':2, 'L':3, 'M':4, 'N':5, 'O':6, 'P':7, 'Q':8, 'R':9,
    'S':1, 'T':2, 'U':3, 'V':4, 'W':5, 'X':6, 'Y':7, 'Z':8
};

// === DOM 快取與狀態 ===
const input = document.getElementById('numInput');
const clearBtn = document.getElementById('clearBtn');
const list = document.getElementById('resultList');
const statsArea = document.getElementById('statsArea');
const previewContainer = document.getElementById('previewContainer');
const formattedDisplay = document.getElementById('formattedText');
const conversionHint = document.getElementById('conversionHint');
const modeSelect = document.getElementById('modeSelect');

let currentMode = 'ai'; 
let currentCopyTexts = { ai: '', client: '', numbers: '' };
let builderActive = false;
let activeStars = ['天醫', '生氣', '延年', '伏位'];
let prevValidRaw = ''; 
let saveHistoryTimeout = null;

// 安全初始化 LocalStorage
let searchHistory = [];
try {
    searchHistory = JSON.parse(localStorage.getItem('magnetic_history') || '[]');
} catch (e) {
    searchHistory = [];
}

// === 系統初始化與事件綁定 ===
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();

    // 靜態 UI 綁定
    document.getElementById('btn-open-history').addEventListener('click', toggleHistory);
    document.getElementById('btn-close-history').addEventListener('click', toggleHistory);
    document.getElementById('btn-clear-history').addEventListener('click', clearAllHistory);
    document.getElementById('builderToggleBtn').addEventListener('click', toggleBuilder);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('btn-copy').addEventListener('click', copyResult);
    clearBtn.addEventListener('click', clearInput);

    // 輸入監聽
    input.addEventListener('input', () => {
        clearBtn.style.display = input.value.length > 0 ? 'flex' : 'none';
        updateAnalysis();
    });

    document.getElementById('builderMaxLen').addEventListener('change', updateAnalysis);
    
    // 模式選擇
    modeSelect.addEventListener('change', (e) => {
        triggerHaptic();
        currentMode = e.target.value;
        formattedDisplay.innerText = currentCopyTexts[currentMode] || '';
    });

    // 事件委派：歷史紀錄操作
    document.getElementById('historyList').addEventListener('click', (e) => {
        const delBtn = e.target.closest('.history-del-btn');
        if (delBtn) {
            e.stopPropagation();
            deleteHistoryItem(delBtn.dataset.val);
            return;
        }
        const itemDiv = e.target.closest('.history-item');
        if (itemDiv) {
            loadHistoryItem(itemDiv.dataset.val);
        }
    });

    // 事件委派：智慧選號膠囊
    document.getElementById('starPills').addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (pill && pill.dataset.star) {
            toggleStar(pill.dataset.star);
        }
    });

    // 事件委派：建議按鈕輸入
    document.getElementById('builderSuggestions').addEventListener('click', (e) => {
        const btn = e.target.closest('.suggest-btn');
        if (btn && btn.dataset.char) {
            appendChar(btn.dataset.char);
        }
    });

    // 事件委派：卡片展開
    list.addEventListener('click', (e) => {
        const item = e.target.closest('.result-item');
        if (item) {
            item.classList.toggle('expanded');
        }
    });
});

// === 輔助與 UI 功能 ===
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function toggleTheme() {
    triggerHaptic();
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const btn = document.getElementById('themeToggleBtn');
    
    if (currentTheme === 'dark') {
        html.removeAttribute('data-theme');
        btn.innerHTML = '🌙'; 
    } else {
        html.setAttribute('data-theme', 'dark');
        btn.innerHTML = '☀️'; 
    }
}

function triggerHaptic() {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(10);
}

// === 歷史紀錄邏輯 ===
function toggleHistory() {
    triggerHaptic();
    document.getElementById('historyPanel').classList.toggle('show');
}

function saveToHistory(val) {
    let cleanVal = val.trim();
    if (!cleanVal || cleanVal.length < 2) return;
    
    searchHistory = searchHistory.filter(item => item !== cleanVal);
    searchHistory.unshift(cleanVal);
    if (searchHistory.length > 50) searchHistory.pop();
    
    localStorage.setItem('magnetic_history', JSON.stringify(searchHistory));
    renderHistory();
}

function loadHistoryItem(val) {
    input.value = val;
    toggleHistory();
    clearBtn.style.display = 'flex';
    updateAnalysis();
}

function deleteHistoryItem(val) {
    searchHistory = searchHistory.filter(item => item !== val);
    localStorage.setItem('magnetic_history', JSON.stringify(searchHistory));
    renderHistory();
}

function clearAllHistory() {
    if(confirm("確定要刪除所有搜尋紀錄嗎？")) {
        searchHistory = [];
        localStorage.setItem('magnetic_history', '[]');
        renderHistory();
    }
}

function renderHistory() {
    const listDiv = document.getElementById('historyList');
    if (searchHistory.length === 0) {
        listDiv.innerHTML = '<div class="empty-history">暫無紀錄</div>';
        return;
    }
    listDiv.innerHTML = searchHistory.map(item => {
        const safeItem = escapeHTML(item);
        return `
        <div class="history-item" data-val="${safeItem}">
            <span class="history-text">${safeItem}</span>
            <button class="history-del-btn" data-val="${safeItem}">✕</button>
        </div>
        `;
    }).join('');
}

// === 智慧配號邏輯 ===
function toggleBuilder() {
    triggerHaptic();
    builderActive = !builderActive;
    const panel = document.getElementById('builderPanel');
    const btn = document.getElementById('builderToggleBtn');
    
    panel.style.display = builderActive ? 'flex' : 'none';
    
    if (builderActive) {
        btn.classList.add('active');
        renderPills();
        prevValidRaw = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else {
        btn.classList.remove('active');
    }
    updateAnalysis();
}

function toggleStar(starName) {
    triggerHaptic();
    if (activeStars.includes(starName)) {
        activeStars = activeStars.filter(s => s !== starName);
    } else {
        activeStars.push(starName);
    }
    renderPills();
    updateAnalysis();
}

function renderPills() {
    const container = document.getElementById('starPills');
    container.innerHTML = Object.keys(stars).map(s => {
        const isActive = activeStars.includes(s);
        const classNames = isActive ? `pill star-bg-${s}` : `pill inactive`;
        return `<div class="${classNames}" data-star="${s}">${s}</div>`;
    }).join('');
}

function clearInput() {
    triggerHaptic();
    input.value = '';
    prevValidRaw = '';
    clearBtn.style.display = 'none';
    updateAnalysis();
    input.focus();
}

// === 核心運算分析 ===
function updateAnalysis() {
    let rawStr = input.value.toUpperCase();
    let cleanedRaw = rawStr.replace(/[^A-Z0-9]/g, ''); 

    clearTimeout(saveHistoryTimeout);
    if (rawStr.length >= 2) {
        saveHistoryTimeout = setTimeout(() => {
            saveToHistory(rawStr);
        }, 1500);
    }

    if (builderActive && cleanedRaw.length > 0) {
        let maxLen = parseInt(document.getElementById('builderMaxLen').value) || 20;
        if (cleanedRaw.length > maxLen) {
            showToast(`⚠️ 已達設定字數上限 (${maxLen}字)`);
            cleanedRaw = prevValidRaw; 
            input.value = cleanedRaw; 
        }
    }

    let convertedVal = cleanedRaw.split('').map(char => /[A-Z]/.test(char) ? letterMap[char] : char).join('');
    let pairs = getPairs(convertedVal);

    if (builderActive && pairs.length > 0) {
        let violatedStar = null;
        for (let p of pairs) {
            let star = getStarDetail(p);
            if (star && !activeStars.includes(star.name)) {
                violatedStar = star.name;
                break;
            }
        }
        if (violatedStar) {
            showToast(`🚫 過濾攔截：產生了【${violatedStar}】`);
            cleanedRaw = prevValidRaw;
            input.value = cleanedRaw;
            convertedVal = cleanedRaw.split('').map(char => /[A-Z]/.test(char) ? letterMap[char] : char).join('');
            pairs = getPairs(convertedVal);
        }
    }

    prevValidRaw = cleanedRaw; 

    if (cleanedRaw.length < 2) { 
        list.innerHTML = ""; formattedDisplay.innerText = "";
        statsArea.style.display = "none"; previewContainer.style.display = "none"; 
        conversionHint.style.display = "none"; 
        currentCopyTexts = { ai: '', client: '', numbers: '' };
        renderSuggestions(convertedVal); 
        return; 
    }

    if (cleanedRaw !== convertedVal) {
        conversionHint.innerText = `💡 字母自動轉換：${cleanedRaw} ➔ ${convertedVal}`;
        conversionHint.style.display = "block";
    } else {
        conversionHint.style.display = "none";
    }

    renderList(pairs);
    generateDataAndStats(cleanedRaw, convertedVal, pairs);
    renderSuggestions(convertedVal);
}

function getPairs(val) {
    let pairs = [];
    if (!val || val.length === 0) return pairs;
    
    let normalIndices = [];
    for (let i = 0; i < val.length; i++) {
        if (val[i] !== '0' && val[i] !== '5') {
            normalIndices.push(i);
        }
    }

    if (normalIndices.length === 0) return pairs; 
    if (normalIndices.length === 1) {
        pairs.push(val);
        return pairs;
    }

    for (let k = 0; k < normalIndices.length - 1; k++) {
        let sliceStart = (k === 0) ? 0 : normalIndices[k];
        let sliceEnd = (k === normalIndices.length - 2) ? val.length : normalIndices[k + 1] + 1;
        pairs.push(val.substring(sliceStart, sliceEnd));
    }
    return pairs;
}

function appendChar(char) {
    triggerHaptic();
    input.value += char;
    clearBtn.style.display = 'flex';
    updateAnalysis();
}

function renderSuggestions(convertedVal) {
    const sugBox = document.getElementById('builderSuggestions');
    if (!builderActive || convertedVal.length === 0) {
        sugBox.style.display = 'none'; return;
    }
    
    let coreDigits = convertedVal.replace(/[05]/g, '');
    let lastCore = coreDigits.length > 0 ? coreDigits.slice(-1) : null;
    
    if (lastCore) {
        let allowedNums = [];
        [1,2,3,4,6,7,8,9].forEach(n => {
            let testPair = lastCore + n;
            let s = getStarDetail(testPair);
            if (s && activeStars.includes(s.name)) allowedNums.push({ num: n, star: s.name });
        });

        if (allowedNums.length > 0) {
            let numBtns = allowedNums.map(item => {
                return `<span class="suggest-btn star-color-${item.star}" data-char="${item.num}">${item.num} (${item.star})</span>`;
            }).join('');

            let lettersForNum = {};
            Object.keys(letterMap).forEach(L => {
                let val = letterMap[L];
                if (!lettersForNum[val]) lettersForNum[val] = [];
                lettersForNum[val].push(L);
            });

            let letterBtns = allowedNums.map(item => {
                return lettersForNum[item.num].map(L => `<span class="suggest-btn" data-char="${L}">${L}</span>`).join('');
            }).join('');
            
            sugBox.innerHTML = `💡 <b>點擊直接插入推薦數字：</b><br>${numBtns}<br><br>🔠 <b>點擊直接插入推薦字母：</b><br>${letterBtns}`;
            sugBox.style.display = 'block';
        } else {
            sugBox.innerHTML = `⚠️ 無法接續任何您勾選的磁場條件`;
            sugBox.style.display = 'block';
        }
    } else {
        sugBox.innerHTML = `請輸入起始數字...`;
        sugBox.style.display = 'block';
    }
}

function getStarDetail(p) {
    let clean = p.replace(/[05]/g, '');
    if (clean.length === 0) return null;
    if (clean.length === 1) clean = clean + clean; 
    if (clean.length > 2) clean = clean[0] + clean[clean.length - 1];

    for (let s in stars) {
        for (let lvl in stars[s].levels) {
            if (stars[s].levels[lvl].includes(clean)) return { name: s, coreNum: clean, level: lvl, type: stars[s].type };
        }
    }
    return null;
}

function getSmartModifierUI(p) {
    let zeroCount = (p.match(/0/g) || []).length; 
    let fiveCount = (p.match(/5/g) || []).length;
    let parts = [];
    if (fiveCount === 1) parts.push("5顯"); else if (fiveCount > 1) parts.push(fiveCount + "重5顯");
    if (zeroCount === 1) parts.push("0隱"); else if (zeroCount > 1) parts.push(zeroCount + "重0隱");
    return parts.length > 0 ? parts.join(' ') : "";
}

function renderList(pairs) {
    list.innerHTML = pairs.map(p => {
        const star = getStarDetail(p); 
        const modifierUI = getSmartModifierUI(p);
        const borderClass = star ? `star-border-${star.name}` : '';
        const colorClass = star ? `star-color-${star.name}` : 'text-tertiary';

        return `
            <div class="result-item ${borderClass}">
                <div class="card-row top-row">
                    <span class="num-tag">${escapeHTML(p)}</span>${modifierUI ? `<span class="num-modifier">${modifierUI}</span>` : ''}
                </div>
                <div class="card-row">
                    <span class="star-name">${star ? star.name : '未知'}${star ? `<span class="star-level">${star.level}</span>` : ''}</span>
                    <span class="star-type ${colorClass}">${star ? star.type : '?'}</span>
                </div>
            </div>`;
    }).join('');
}

function generateDataAndStats(originalStr, convertedStr, pairs) {
    let validStars = [], luckyCount = 0, unluckyCount = 0, aiItems = [], clientItems = [], numItems = [];

    pairs.forEach(p => {
        const star = getStarDetail(p);
        if (star) {
            validStars.push(star);
            if (star.type === "吉") luckyCount++; else if (star.type === "凶") unluckyCount++;
        }
        const starName = star ? star.name : "未知"; const coreNum = star ? star.coreNum : p;
        const level = star ? `-${star.level}` : ''; 
        
        const modifierUI = getSmartModifierUI(p);
        const modifierCopy = modifierUI ? `(${modifierUI})` : '';
        
        aiItems.push(`${starName}${coreNum}${level}${modifierCopy ? ' ' + modifierCopy : ''} [${p}]`);
        clientItems.push(`${starName}(${star ? star.type : '?'})`);
        numItems.push(p);
    });

    let total = luckyCount + unluckyCount;
    let luckyPct = total > 0 ? Math.round((luckyCount / total) * 100) : 0;
    let unluckyPct = total > 0 ? Math.round((unluckyCount / total) * 100) : 0;
    let ratioText = total > 0 ? `吉 ${luckyPct}% / 凶 ${unluckyPct}%` : "無";

    let flowText = "無";
    if (validStars.length >= 2) flowText = `${validStars[0].name} ➔ ${validStars[validStars.length - 1].name}`;
    else if (validStars.length === 1) flowText = `單一 (${validStars[0].name})`;

    let statsString = `📊 統計：${ratioText}\n🔄 流向：${flowText}`;
    let headerDisplay = (originalStr !== convertedStr) ? `${originalStr} ➔ ${convertedStr}` : originalStr;

    currentCopyTexts = {
        ai: `${headerDisplay} ➔ ${aiItems.join(' + ')}\n\n${statsString}`,
        client: `${headerDisplay} ➔ ${clientItems.join(' ➔ ')}\n\n${statsString}`,
        numbers: numItems.join(', ')
    };

    if (total > 0) {
        statsArea.style.display = "flex"; previewContainer.style.display = "block"; 
        document.getElementById('statRatio').innerText = `📊 ${ratioText}`;
        document.getElementById('statFlow').innerText = `🔄 ${flowText}`;
    } else {
        statsArea.style.display = "none"; previewContainer.style.display = "none"; 
    }
    formattedDisplay.innerText = currentCopyTexts[currentMode];
}

// === 剪貼簿與 Toast 邏輯 ===
function showToast(message) {
    const existingToast = document.getElementById('ios-toast');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.id = 'ios-toast'; toast.className = 'toast-message'; toast.innerHTML = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); toast.addEventListener('transitionend', () => toast.remove()); }, 2000);
}

function copyResult() {
    triggerHaptic();
    const text = formattedDisplay.innerText;
    if (!text) { showToast('⚠️ 請先輸入有效號碼'); return; }
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => showToast('✅ 已成功複製到剪貼簿')).catch(() => fallbackCopyTextToClipboard(text));
    } else fallbackCopyTextToClipboard(text);
}

function fallbackCopyTextToClipboard(text) {
    let textArea = document.createElement("textarea"); textArea.value = text;
    textArea.style.position = "fixed"; textArea.style.top = "-999999px"; textArea.style.left = "-999999px";
    document.body.appendChild(textArea); textArea.focus(); textArea.select();
    try { document.execCommand('copy'); showToast('✅ 已成功複製到剪貼簿'); } catch (err) { showToast('❌ 複製失敗，請手動複製文字'); }
    textArea.remove();
}
