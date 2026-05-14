// ─────────────────────────────────────────────────────────────────────────────
// app.js — Visualización combinada Real Madrid vs FC Barcelona (Con Sonido)
// ─────────────────────────────────────────────────────────────────────────────

// Colores para el gráfico base (líneas): color único por equipo
const COLORES_MAIN = {
    realMadrid: { local: '#005A9F', visita: '#005A9F' },
    barcelona:  { local: '#A50044', visita: '#A50044' }
};

// Colores para los sidebars: RM sin cambio, FCB visita en rojo más claro
const COLORES = {
    realMadrid: { local: '#005A9F', visita: '#00a8ff' },
    barcelona:  { local: '#A50044', visita: '#E8537A' }
};

// ─── Configuración de Sonidos ────────────────────────────────────────────────
const sonidosLocalia = {
    realMadrid: {
        weno: new Audio('audio/rm_weno.mp3'),
        meh: new Audio('audio/rm_meh.mp3')
    },
    barcelona: {
        weno: new Audio('audio/gol-messi-vs-getafe-narrat-per-puyal-full-hd-1080p-audiotrimmer-1.mp3'),
        meh: new Audio('audio/som-apito-do-juiz-mp3cut.mp3')
    }
};

function reproducirSonido(equipo, golesLocal, golesVisita) {
    // Pausar y reiniciar audios para evitar que se solapen
    Object.values(sonidosLocalia).forEach(e => {
        e.weno.pause(); e.weno.currentTime = 0;
        e.meh.pause(); e.meh.currentTime = 0;
    });

    // Lógica: "weno" si rinde mejor de local, "meh" si no
    if (golesLocal > golesVisita) {
        sonidosLocalia[equipo].weno.play().catch(e => console.log("Clic para activar sonido"));
    } else {
        sonidosLocalia[equipo].meh.play().catch(e => console.log("Clic para activar sonido"));
    }
}

const SIDEBAR_WIDTH = 340;
const state = { rmOpen: false, fcbOpen: false };
const detailInstances = {};

// ─── Recalcular márgenes del main-content ─────────────────────────────────────
function actualizarMargenes(mainContent) {
    if (window.innerWidth <= 768) {
        mainContent.style.marginLeft  = '';
        mainContent.style.marginRight = '';
        return;
    }
    mainContent.style.marginLeft  = state.rmOpen  ? `${SIDEBAR_WIDTH}px` : '';
    mainContent.style.marginRight = state.fcbOpen ? `${SIDEBAR_WIDTH}px` : '';
}

// ─── Inicialización ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const sidebarRM   = document.getElementById('sidebar-rm');
    const sidebarFCB  = document.getElementById('sidebar-fcb');
    const mainContent = document.getElementById('main-content');

    document.getElementById('close-btn-rm').addEventListener('click', () => {
        sidebarRM.classList.remove('active');
        state.rmOpen = false;
        actualizarMargenes(mainContent);
    });

    document.getElementById('close-btn-fcb').addEventListener('click', () => {
        sidebarFCB.classList.remove('active');
        state.fcbOpen = false;
        actualizarMargenes(mainContent);
    });

    fetch('data/data.json')
        .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
        })
        .then(matchData => inicializarGrafico(matchData, sidebarRM, sidebarFCB, mainContent))
        .catch(err => {
            console.error(err);
        });
});

// ─── Plugin: etiquetas inline al final de cada línea ─────────────────────────
const inlineLabelPlugin = {
    id: 'inlineLabel',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const MIN_GAP = 14; 
        const entries = [];
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.visible || !meta.data.length) return;
            const lastPoint = meta.data[meta.data.length - 1];
            entries.push({ dataset, x: lastPoint.x + 8, y: lastPoint.y });
        });
        entries.sort((a, b) => a.y - b.y);
        for (let i = 1; i < entries.length; i++) {
            const prev = entries[i - 1];
            const curr = entries[i];
            if (curr.y - prev.y < MIN_GAP) curr.y = prev.y + MIN_GAP;
        }
        entries.forEach(({ dataset, x, y }) => {
            ctx.save();
            ctx.font = 'bold 11px "Segoe UI", sans-serif';
            ctx.fillStyle = dataset.borderColor;
            ctx.textBaseline = 'middle';
            ctx.fillText(dataset.label, x, y);
            ctx.restore();
        });
    }
};

// ─── Gráfico de líneas combinado ──────────────────────────────────────────────
function inicializarGrafico(matchData, sidebarRM, sidebarFCB, mainContent) {
    const labels = matchData.realMadrid.map(d => d.temporada);
    const ctx    = document.getElementById('chartCombinado').getContext('2d');

    new Chart(ctx, {
        type: 'line',
        plugins: [inlineLabelPlugin],
        data: {
            labels,
            datasets: [
                {
                    label: 'RM Local',
                    data: matchData.realMadrid.map(d => d.local),
                    borderColor: COLORES_MAIN.realMadrid.local,
                    backgroundColor: COLORES_MAIN.realMadrid.local,
                    borderWidth: 2.5, tension: 0.3,
                    pointRadius: 5, pointHoverRadius: 9, borderDash: []
                },
                {
                    label: 'RM Visita',
                    data: matchData.realMadrid.map(d => d.visita),
                    borderColor: COLORES_MAIN.realMadrid.visita,
                    backgroundColor: COLORES_MAIN.realMadrid.visita,
                    borderWidth: 2, tension: 0.3,
                    pointRadius: 5, pointHoverRadius: 9, borderDash: [6, 4]
                },
                {
                    label: 'FCB Local',
                    data: matchData.barcelona.map(d => d.local),
                    borderColor: COLORES_MAIN.barcelona.local,
                    backgroundColor: COLORES_MAIN.barcelona.local,
                    borderWidth: 2.5, tension: 0.3,
                    pointRadius: 5, pointHoverRadius: 9, borderDash: []
                },
                {
                    label: 'FCB Visita',
                    data: matchData.barcelona.map(d => d.visita),
                    borderColor: COLORES_MAIN.barcelona.visita,
                    backgroundColor: COLORES_MAIN.barcelona.visita,
                    borderWidth: 2, tension: 0.3,
                    pointRadius: 5, pointHoverRadius: 9, borderDash: [6, 4]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { right: 90 } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    titleColor: '#333', bodyColor: '#555',
                    borderColor: '#ddd', borderWidth: 1,
                    callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} goles` }
                }
            },
            scales: {
                y: { beginAtZero: false, min: 20, max: 70, title: { display: true, text: 'Goles totales' } }
            },
            onHover: (event, el) => {
                event.native.target.style.cursor = el.length ? 'pointer' : 'default';
            },
            onClick: (event, elements, chart) => {
                if (!elements.length) return;
                
                // 1. Lógica original para sidebars (usa la temporada/índice)
                const idx = elements[0].index;
                abrirAmbosDetalles(matchData.realMadrid[idx], matchData.barcelona[idx], sidebarRM, sidebarFCB, mainContent);

                // 2. Lógica para Sonido (usa el punto exacto)
                const punto = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
                if (punto.length === 0) return;

                const datasetIndex = punto[0].datasetIndex;
                let equipo = "";
                let golesLocal = 0;
                let golesVisita = 0;

                if (datasetIndex === 0 || datasetIndex === 1) {
                    equipo = "realMadrid";
                    golesLocal = matchData.realMadrid[idx].local;
                    golesVisita = matchData.realMadrid[idx].visita;
                } else if (datasetIndex === 2 || datasetIndex === 3) {
                    equipo = "barcelona";
                    golesLocal = matchData.barcelona[idx].local;
                    golesVisita = matchData.barcelona[idx].visita;
                }

                if (equipo !== "") {
                    reproducirSonido(equipo, golesLocal, golesVisita);
                }
            }
        }
    });
}

// ─── Funciones Auxiliares (Cálculos y Renderizado) ────────────────────────────
function categorizarGoles(g) {
    g = parseInt(g);
    if (g === 0) return '0 goles';
    if (g === 1) return '1 gol';
    if (g === 2) return '2 goles';
    return '3+ goles';
}

function calcularConsistencia(data) {
    const orden = ['0 goles', '1 gol', '2 goles', '3+ goles'];
    const distLocal  = Object.fromEntries(orden.map(k => [k, 0]));
    const distVisita = Object.fromEntries(orden.map(k => [k, 0]));
    if (Array.isArray(data.partidosDetalle)) {
        data.partidosDetalle.forEach(p => {
            const cat = categorizarGoles(p.goles);
            if (p.condicion === 'local') distLocal[cat]++;
            else distVisita[cat]++;
        });
    }
    return { labels: orden, local: orden.map(k => distLocal[k]), visita: orden.map(k => distVisita[k]) };
}

function abrirAmbosDetalles(dataRM, dataFCB, sidebarRM, sidebarFCB, mainContent) {
    renderSidebarContent(dataRM, 'Real Madrid', 'panel-title-rm', 'stats-container-rm', COLORES.realMadrid);
    renderSidebarContent(dataFCB, 'FC Barcelona', 'panel-title-fcb', 'stats-container-fcb', COLORES.barcelona);
    renderDetailChart('detailChartRM', dataRM.local, dataRM.visita, COLORES.realMadrid, 'detailChartRM');
    renderDetailChart('detailChartFCB', dataFCB.local, dataFCB.visita, COLORES.barcelona, 'detailChartFCB');

    sidebarRM.classList.add('active');
    sidebarFCB.classList.add('active');
    state.rmOpen = true;
    state.fcbOpen = true;
    actualizarMargenes(mainContent);

    const consistenciaRM  = calcularConsistencia(dataRM);
    const consistenciaFCB = calcularConsistencia(dataFCB);
    setTimeout(() => {
        renderConsistenciaChart('consistenciaChartRM', consistenciaRM, COLORES.realMadrid, 'consistenciaRM');
        renderConsistenciaChart('consistenciaChartFCB', consistenciaFCB, COLORES.barcelona, 'consistenciaFCB');
    }, 50);
}

function renderSidebarContent(data, nombre, titleId, containerId, colores) {
    const diferencia = data.local - data.visita;
    const diffTexto  = diferencia > 0 ? `+${diferencia}` : `${diferencia}`;
    const diffColor  = diferencia > 0 ? '#27ae60' : diferencia < 0 ? '#c0392b' : '#888';
    document.getElementById(titleId).innerText = `${nombre} — ${data.temporada}`;
    document.getElementById(containerId).innerHTML = `
        <p>🏠 <strong>De local:</strong> ${data.local} goles <br><em>(${data.promedioLocal} g/p)</em></p>
        <p>✈️ <strong>De visita:</strong> ${data.visita} goles <br><em>(${data.promedioVisita} g/p)</em></p>
        <p>📊 <strong>Diferencia:</strong> <span style="color:${diffColor};font-weight:bold;">${diffTexto} goles</span></p>
    `;
}

function renderDetailChart(canvasId, local, visita, colores, instanceKey) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (detailInstances[instanceKey]) detailInstances[instanceKey].destroy();
    detailInstances[instanceKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Local', 'Visita'],
            datasets: [{ data: [local, visita], backgroundColor: [colores.local, colores.visita], borderRadius: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 80 } } }
    });
}

function renderConsistenciaChart(canvasId, consistencia, colores, instanceKey) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (detailInstances[instanceKey]) detailInstances[instanceKey].destroy();
    detailInstances[instanceKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: consistencia.labels,
            datasets: [
                { label: 'Local', data: consistencia.local, backgroundColor: colores.local, borderRadius: 4 },
                { label: 'Visita', data: consistencia.visita, backgroundColor: colores.visita, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } } },
            scales: { x: { ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } } }
        }
    });
}