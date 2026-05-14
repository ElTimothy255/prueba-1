// ─────────────────────────────────────────────────────────────────────────────
// app.js — Visualización combinada Real Madrid vs FC Barcelona
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

// ─── Audios para interactividad ───────────────────────────────────────────────
const sonidosLocalia = {
    realMadrid: {
        weno: new Audio('audio/rm_weno.mp3'),
        meh: new Audio('audio/rm_meh.mp3')
    },
    barcelona: {
        weno: new Audio('audio/fcb_weno.mp3'),
        meh: new Audio('audio/fcb_meh.mp3')
    }
};

function reproducirSonido(equipo, golesLocal, golesVisita) {
    // Pausar y reiniciar audios para evitar que se saturen si hacen clics rápidos
    Object.values(sonidosLocalia).forEach(e => {
        e.weno.pause(); e.weno.currentTime = 0;
        e.meh.pause(); e.meh.currentTime = 0;
    });

    // Validar rendimiento de la temporada
    if (golesLocal > golesVisita) {
        sonidosLocalia[equipo].weno.play().catch(e => console.log("Esperando clic del usuario..."));
    } else {
        sonidosLocalia[equipo].meh.play().catch(e => console.log("Esperando clic del usuario..."));
    }
}

const SIDEBAR_WIDTH = 340;

const state = { rmOpen: false, fcbOpen: false };

// Instancias Chart.js activas (para destruir antes de recrear)
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
            mainContent.innerHTML = `
                <div style="text-align:center;padding:3rem;color:#c0392b;">
                    <h2>⚠️ Error al cargar los datos</h2>
                    <p>${err.message}</p>
                    <p style="font-size:.85rem;color:#888;">
                        Asegúrate de que <code>data/data.json</code> existe y el servidor está activo.
                    </p>
                </div>`;
        });
});

// ─── Plugin: etiquetas inline al final de cada línea ─────────────────────────
const inlineLabelPlugin = {
    id: 'inlineLabel',
    afterDatasetsDraw(chart) {
        const { ctx } = chart;
        const MIN_GAP = 14; // mínimo de píxeles entre etiquetas

        // Recopilar posiciones originales
        const entries = [];
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (!meta.visible || !meta.data.length) return;
            const lastPoint = meta.data[meta.data.length - 1];
            entries.push({ dataset, x: lastPoint.x + 8, y: lastPoint.y });
        });

        // Ordenar por y para aplicar separación de arriba a abajo
        entries.sort((a, b) => a.y - b.y);

        // Ajustar posiciones para evitar solapamientos
        for (let i = 1; i < entries.length; i++) {
            const prev = entries[i - 1];
            const curr = entries[i];
            if (curr.y - prev.y < MIN_GAP) {
                curr.y = prev.y + MIN_GAP;
            }
        }

        // Dibujar etiquetas con posiciones ajustadas
        entries.forEach(({ dataset, x, y }) => {
            ctx.save();
            ctx.font         = 'bold 11px "Segoe UI", sans-serif';
            ctx.fillStyle    = dataset.borderColor;
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
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} goles`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false, min: 20, max: 70,
                    title: { display: true, text: 'Goles totales' }
                }
            },
            onHover: (event, el) => {
                event.native.target.style.cursor = el.length ? 'pointer' : 'default';
            },
            onClick: (event, elements) => {
                if (!elements.length) return;
                
                const idx = elements[0].index;
                const datasetIndex = elements[0].datasetIndex;
                
                // 1. Abrir sidebars y procesar sub-gráficos (tu código original)
                abrirAmbosDetalles(
                    matchData.realMadrid[idx],
                    matchData.barcelona[idx],
                    sidebarRM, sidebarFCB, mainContent
                );

                // 2. Lógica nueva: Detectar equipo para el sonido
                let equipo = "";
                let golesLocal = 0;
                let golesVisita = 0;

                if (datasetIndex === 0 || datasetIndex === 1) { 
                    // Clickeó una línea del Real Madrid
                    equipo = "realMadrid";
                    golesLocal = matchData.realMadrid[idx].local;
                    golesVisita = matchData.realMadrid[idx].visita;
                } else if (datasetIndex === 2 || datasetIndex === 3) { 
                    // Clickeó una línea del FC Barcelona
                    equipo = "barcelona";
                    golesLocal = matchData.barcelona[idx].local;
                    golesVisita = matchData.barcelona[idx].visita;
                }

                // 3. Reproducir
                if (equipo !== "") {
                    reproducirSonido(equipo, golesLocal, golesVisita);
                }
            }
        }
    });
}

// ─── Categorizar goles (igual que el notebook) ────────────────────────────────
function categorizarGoles(g) {
    g = parseInt(g);
    if (g === 0) return '0 goles';
    if (g === 1) return '1 gol';
    if (g === 2) return '2 goles';
    return '3+ goles';
}

// ─── Calcular distribución de consistencia ofensiva ──────────────────────────
// Lee data.partidosDetalle: array de { condicion: 'local'|'visita', goles: N }
// generado directamente desde los archivos Excel de LaLiga.
function calcularConsistencia(data) {
    const orden = ['0 goles', '1 gol', '2 goles', '3+ goles'];
    const distLocal  = Object.fromEntries(orden.map(k => [k, 0]));
    const distVisita = Object.fromEntries(orden.map(k => [k, 0]));

    if (Array.isArray(data.partidosDetalle)) {
        data.partidosDetalle.forEach(p => {
            const cat = categorizarGoles(p.goles);
            if (p.condicion === 'local') distLocal[cat]++;
            else                         distVisita[cat]++;
        });
    }

    return {
        labels: orden,
        local:  orden.map(k => distLocal[k]),
        visita: orden.map(k => distVisita[k])
    };
}

// ─── Abrir ambos sidebars ─────────────────────────────────────────────────────
function abrirAmbosDetalles(dataRM, dataFCB, sidebarRM, sidebarFCB, mainContent) {
    // 1. Texto estadístico
    renderSidebarContent(dataRM,  'Real Madrid',  'panel-title-rm',  'stats-container-rm',  COLORES.realMadrid);
    renderSidebarContent(dataFCB, 'FC Barcelona', 'panel-title-fcb', 'stats-container-fcb', COLORES.barcelona);

    // 2. Gráfico de barras: goles totales Local vs Visita
    renderDetailChart('detailChartRM',  dataRM.local,  dataRM.visita,  COLORES.realMadrid, 'detailChartRM');
    renderDetailChart('detailChartFCB', dataFCB.local, dataFCB.visita, COLORES.barcelona,  'detailChartFCB');

    // 3. Activar sidebars
    sidebarRM.classList.add('active');
    sidebarFCB.classList.add('active');
    state.rmOpen  = true;
    state.fcbOpen = true;
    actualizarMargenes(mainContent);

    // 4. Gráfico de consistencia ofensiva — renderizar tras 50ms para
    //    garantizar que el canvas ya tiene dimensiones reales (transición CSS)
    const consistenciaRM  = calcularConsistencia(dataRM);
    const consistenciaFCB = calcularConsistencia(dataFCB);
    setTimeout(() => {
        renderConsistenciaChart('consistenciaChartRM',  consistenciaRM,  COLORES.realMadrid, 'consistenciaRM');
        renderConsistenciaChart('consistenciaChartFCB', consistenciaFCB, COLORES.barcelona,  'consistenciaFCB');
    }, 50);
}

// ─── Contenido de texto del sidebar ──────────────────────────────────────────
function renderSidebarContent(data, nombre, titleId, containerId, colores) {
    const diferencia = data.local - data.visita;
    const diffTexto  = diferencia > 0 ? `+${diferencia}` : `${diferencia}`;
    const diffColor  = diferencia > 0 ? '#27ae60' : diferencia < 0 ? '#c0392b' : '#888';

    document.getElementById(titleId).innerText = `${nombre} — ${data.temporada}`;
    document.getElementById(containerId).innerHTML = `
        <p>🏠 <strong>De local:</strong> ${data.local} goles en ${data.partidos} partidos
           <em>(${data.promedioLocal} goles/partido)</em></p>
        <p>✈️ <strong>De visita:</strong> ${data.visita} goles en ${data.partidos} partidos
           <em>(${data.promedioVisita} goles/partido)</em></p>
        <p>📊 <strong>Diferencia de localía:</strong>
           <span style="color:${diffColor};font-weight:bold;">${diffTexto} goles</span></p>
    `;
}

// ─── Gráfico 1: goles totales Local vs Visita ────────────────────────────────
function renderDetailChart(canvasId, local, visita, colores, instanceKey) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (detailInstances[instanceKey]) detailInstances[instanceKey].destroy();

    detailInstances[instanceKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Local', 'Visita'],
            datasets: [{
                label: 'Goles',
                data: [local, visita],
                backgroundColor: [colores.local, colores.visita],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, max: 80 } }
        }
    });
}

// ─── Gráfico 2: consistencia ofensiva (distribución de goles por partido) ─────
function renderConsistenciaChart(canvasId, consistencia, colores, instanceKey) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (detailInstances[instanceKey]) detailInstances[instanceKey].destroy();

    detailInstances[instanceKey] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: consistencia.labels,
            datasets: [
                {
                    label: 'Local',
                    data: consistencia.local,
                    backgroundColor: colores.local,
                    borderRadius: 4
                },
                {
                    label: 'Visita',
                    data: consistencia.visita,
                    backgroundColor: colores.visita,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { font: { size: 10 }, boxWidth: 12, padding: 8 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} partidos`
                    }
                }
            },
            scales: {
                x: { ticks: { font: { size: 10 } } },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Partidos', font: { size: 10 } },
                    ticks: { stepSize: 1, font: { size: 10 } }
                }
            }
        }
    });
}