let sections = [
    { 
        title: "Non-Clinical", 
        isCollapsed: false,
        items: [{ type: 'task', name: 'M4数据整理', status: 'active', start: '2026-02-15', duration: '10', isExpanded: true }] 
    }
];

const colorThemes = {
    sanofi: { active: '#d8b4fe', done: '#78cfa0', crit: '#7030A0', milestone: '#FA283D' },
    sweet: { active: '#ffc0cb', done: '#a0c4ff', crit: '#ffd166', milestone: '#ef476f' },
    forest: { active: '#74c69d', done: '#2d6a4f', crit: '#081c15', milestone: '#ffb703' }
};

let currentTheme = 'sanofi';

// 初始化 Mermaid 配置
mermaid.initialize({ 
    startOnLoad: false, 
    theme: 'base', 
    gantt: { useMaxWidth: false, leftPadding: 100 } 
});

window.onload = () => { renderSections(); };

// --- 逻辑控制函数 ---

function toggleCollapse(sIdx) {
    sections[sIdx].isCollapsed = !sections[sIdx].isCollapsed;
    renderSections();
}

function toggleItem(sIdx, iIdx) {
    sections[sIdx].items[iIdx].isExpanded = !sections[sIdx].items[iIdx].isExpanded;
    renderSections();
}

function addItem(sIdx, type) {
    const d = document.getElementById('target-date').value;
    sections[sIdx].items.push(type === 'task' ? 
        {type:'task', name:'新任务', status:'active', start:d, duration:'5', isExpanded:true} : 
        {type:'milestone', name:'里程碑', start:d, isExpanded:true});
    renderSections();
}

function addSection() {
    sections.push({ title: "新板块", isCollapsed: false, items: [] });
    renderSections();
}

function setTheme(t) {
    currentTheme = t;
    updateChart();
}

// --- 核心渲染函数 ---

function renderSections() {
    const container = document.getElementById('editor-container');
    container.innerHTML = '';
    
    sections.forEach((sec, sIdx) => {
        const card = document.createElement('div');
        card.className = 'section-card';
        
        card.innerHTML = `
            <div class="section-head">
                <span class="toggle-btn" onclick="toggleCollapse(${sIdx})">${sec.isCollapsed ? '▶' : '▼'}</span>
                <input type="text" value="${sec.title}" oninput="sections[${sIdx}].title=this.value; updateChart()">
                <button onclick="sections.splice(${sIdx},1); renderSections()" style="color:white;border:none;background:none;cursor:pointer;font-size:18px;">×</button>
            </div>
            <div class="item-list" style="display: ${sec.isCollapsed ? 'none' : 'block'}">
                ${sec.items.map((item, iIdx) => `
                    <div class="item-box">
                        <div class="item-header" onclick="toggleItem(${sIdx}, ${iIdx})">
                            <span style="font-size:10px;">${item.isExpanded ? '▼' : '▶'}</span>
                            <span style="flex:1; font-weight:500;">${item.name || '未命名事项'}</span>
                            <button style="border:none; background:none; color:#999; cursor:pointer;" onclick="event.stopPropagation(); sections[${sIdx}].items.splice(${iIdx},1); renderSections()">×</button>
                        </div>
                        ${item.isExpanded ? `
                            <div class="item-body">
                                <div class="form-row">
                                    <label>名称</label>
                                    <input type="text" value="${item.name}" oninput="sections[${sIdx}].items[${iIdx}].name=this.value; updateChart(); this.parentElement.parentElement.previousElementSibling.children[1].innerText=this.value">
                                </div>
                                ${item.type === 'task' ? `
                                    <div class="form-row">
                                        <label>状态</label>
                                        <select onchange="sections[${sIdx}].items[${iIdx}].status=this.value; updateChart()">
                                            <option value="active" ${item.status==='active'?'selected':''}>进行中</option>
                                            <option value="done" ${item.status==='done'?'selected':''}>已完成</option>
                                            <option value="crit" ${item.status==='crit'?'selected':''}>紧急</option>
                                        </select>
                                    </div>
                                    <div class="form-row">
                                        <label>天数</label>
                                        <input type="number" value="${item.duration}" oninput="sections[${sIdx}].items[${iIdx}].duration=this.value; updateChart()">
                                    </div>
                                ` : ''}
                                <div class="form-row">
                                    <label>日期</label>
                                    <input type="date" value="${item.start}" onchange="sections[${sIdx}].items[${iIdx}].start=this.value; updateChart()">
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
                <div style="padding:10px; display:flex; gap:10px;">
                    <button class="btn" style="margin:0; font-size:12px; background:#ddd; color:#333;" onclick="addItem(${sIdx}, 'task')">+ 事项</button>
                    <button class="btn" style="margin:0; font-size:12px; background:#ddd; color:#333;" onclick="addItem(${sIdx}, 'milestone')">+ 里程碑</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    updateChart();
}

async function updateChart() {
    const target = document.getElementById('mermaid-render');
    const isTimelineEnabled = document.getElementById('enable-timeline').checked;
    const dateLine = document.getElementById('target-date').value;

    let mmd = `gantt\n  title ${document.getElementById('proj-title').value}\n  dateFormat YYYY-MM-DD\n  axisFormat %m-%d\n`;
    
    // 时间线逻辑
    if (isTimelineEnabled && dateLine) {
        mmd += `  todayMarker stroke-width:2px,stroke:#7030A0,stroke-dasharray:5,5\n`;
    } else {
        mmd += `  todayMarker off\n`;
    }

    sections.forEach(sec => {
        mmd += `  section ${sec.title}\n`;
        sec.items.forEach(item => {
            if(item.name && item.start) {
                const tag = item.type === 'task' ? item.status : 'milestone';
                const dur = item.type === 'task' ? item.duration + 'd' : '0d';
                mmd += `    ${item.name} :${tag}, ${item.start}, ${dur}\n`;
            }
        });
    });

    target.removeAttribute('data-processed');
    target.textContent = mmd;

    try {
        await mermaid.run({ nodes: [target] });
        forceColorize();
    } catch (e) {
        console.error("Mermaid error:", e);
    }
}

// --- 暴力改色逻辑（已修复边缘重叠问题） ---

function forceColorize() {
    const svg = document.querySelector('.mermaid svg');
    if (!svg) return;
    const theme = colorThemes[currentTheme];
    
    svg.querySelectorAll('rect').forEach(bar => {
        const cls = bar.getAttribute('class') || '';
        
        // 关键修复：去掉边框，防止颜色重叠产生的“粉色边缘”
        bar.style.stroke = 'none'; 
        bar.style.fillOpacity = "1";

        if (cls.includes('active')) {
            bar.style.fill = theme.active;
        } else if (cls.includes('done')) {
            bar.style.fill = theme.done;
        } else if (cls.includes('crit')) {
            bar.style.fill = theme.crit;
        } else if (cls.includes('milestone')) {
            bar.style.fill = theme.milestone;
        }
    });
}

// --- 下载功能 ---

document.getElementById('btn-download').onclick = () => {
    const svg = document.querySelector('.mermaid svg');
    const serializer = new XMLSerializer();
    const source = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(svg);
    const link = document.createElement("a");
    link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
    link.download = `${document.getElementById('proj-title').value}.svg`;
    link.click();
};