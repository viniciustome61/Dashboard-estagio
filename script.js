// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv';

const MESES_ORDENADOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
let todosOsDados = [];
const PALETA_DE_CORES = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22', '#34495e', '#f39c12', '#d35400', '#c0392b', '#8e44ad', '#2980b9', '#27ae60', '#d35400'];
const mapaDeCores = {};


// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================
document.addEventListener('DOMContentLoaded', iniciarDashboard);

async function iniciarDashboard() {
    todosOsDados = await carregarDados(URL_CUSTOS_FIXOS);

    if (todosOsDados && todosOsDados.length > 0) {
        gerarMapaDeCores(todosOsDados);
        popularFiltros(todosOsDados);
        configurarEventListeners(todosOsDados);
        atualizarDashboard(todosOsDados, { mes: 'Todos', empresa: 'Todos' });
    } else {
        console.error("Não foi possível renderizar o painel: Nenhum dado foi carregado ou a planilha está vazia.");
    }
    iniciarRotacao(120000);
}


// =======================================================
// --- FUNÇÕES DE CONFIGURAÇÃO E LÓGICA ---
// =======================================================
function gerarMapaDeCores(dados) {
    const empresasUnicas = [...new Set(dados.map(item => item.Empresa.trim()))].sort();
    empresasUnicas.forEach((empresa, index) => {
        mapaDeCores[empresa] = PALETA_DE_CORES[index % PALETA_DE_CORES.length];
    });
}

function popularFiltros(dados) {
    const filtroMes = document.getElementById('filtro-mes');
    const filtroEmpresa = document.getElementById('filtro-empresa');
    const anoAtual = new Date().getFullYear();
    const dadosAnoAtual = dados.filter(d => Number(d.Ano) === anoAtual);
    const mesesUnicos = [...new Set(dadosAnoAtual.map(item => item.Mes.trim()))].sort((a, b) => MESES_ORDENADOS.indexOf(a) - MESES_ORDENADOS.indexOf(b));
    const empresasUnicas = [...new Set(dadosAnoAtual.map(item => item.Empresa.trim()))].sort();

    filtroMes.innerHTML = '<option value="Todos">Todos</option>';
    mesesUnicos.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes;
        option.textContent = mes;
        filtroMes.appendChild(option);
    });

    filtroEmpresa.innerHTML = '<option value="Todos">Todos</option>';
    empresasUnicas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa;
        option.textContent = empresa;
        filtroEmpresa.appendChild(option);
    });
}

function configurarEventListeners(dados) {
    const botaoFiltrar = document.getElementById('botao-filtrar');
    botaoFiltrar.addEventListener('click', () => {
        const mesSelecionado = document.getElementById('filtro-mes').value;
        const empresaSelecionada = document.getElementById('filtro-empresa').value;
        const filtros = { mes: mesSelecionado, empresa: empresaSelecionada };
        atualizarDashboard(dados, filtros);
    });
}

function atualizarDashboard(dados, filtros) {
    const anoAtual = new Date().getFullYear();
    const dadosAnoInteiro = dados.filter(d => Number(d.Ano) === anoAtual);
    
    let dadosParaVisao = [...dadosAnoInteiro];

    if (filtros.mes !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Mes && d.Mes.trim() === filtros.mes);
    }
    if (filtros.empresa !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
    }

    const custoAnualTotal = dadosAnoInteiro.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);
    const mesesPassados = new Date().getMonth() + 1;
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;
    const custoSelecaoAtual = dadosParaVisao.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);

    document.querySelector('#custo-anual-total-card h3').textContent = `Custo Anual Total (${anoAtual})`;
    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.querySelector('#custo-mes-atual-card h3').textContent = `Custo da Seleção`;
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoSelecaoAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);

    const tituloGraficoEsquerda = document.querySelector('#graficoAnualEmpresas').closest('.grafico-wrapper').querySelector('h4');
    const tituloPainelDireita = document.getElementById('titulo-wrapper-direita');
    const containerDireita = document.getElementById('container-direita');

    // --- LÓGICA FINAL E SIMPLIFICADA ---
    // Se uma empresa específica for selecionada, mostramos a Visão Detalhada dela.
    if (filtros.empresa !== 'Todos') {
        // --- MODO: VISÃO DETALHADA ---
        tituloGraficoEsquerda.textContent = `Evolução Mensal - ${filtros.empresa}`;
        tituloPainelDireita.textContent = `Indicadores Chave - ${filtros.empresa}`;

        const dadosDaEmpresaNoAno = dadosAnoInteiro.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
        
        const gastosMensais = Array(12).fill(0);
        dadosDaEmpresaNoAno.forEach(item => {
            const indiceMes = MESES_ORDENADOS.indexOf(item.Mes.trim());
            if (indiceMes !== -1) {
                gastosMensais[indiceMes] = Number(item.ValorGasto || 0);
            }
        });
        renderizarGrafico('graficoAnualEmpresas', 'line', MESES_ORDENADOS, gastosMensais, `Custo Mensal de ${filtros.empresa}`);

        const gastosValidos = dadosDaEmpresaNoAno.map(d => Number(d.ValorGasto || 0)).filter(v => v > 0);
        if (gastosValidos.length > 0) {
            const media = gastosValidos.reduce((a, b) => a + b, 0) / gastosValidos.length;
            const max = Math.max(...gastosValidos);
            const min = Math.min(...gastosValidos);
            const mesMax = dadosDaEmpresaNoAno.find(d => Number(d.ValorGasto) === max).Mes;
            const mesMin = dadosDaEmpresaNoAno.find(d => Number(d.ValorGasto) === min).Mes;

            containerDireita.innerHTML = `
                <div class="kpi-container">
                    <div class="kpi-card">
                        <h5>Custo Médio Mensal</h5>
                        <p>${formatarMoeda(media)}</p>
                    </div>
                    <div class="kpi-card">
                        <h5>Mês de Maior Custo</h5>
                        <p>${mesMax} (${formatarMoeda(max)})</p>
                    </div>
                    <div class="kpi-card">
                        <h5>Mês de Menor Custo</h5>
                        <p>${mesMin} (${formatarMoeda(min)})</p>
                    </div>
                </div>
            `;
        } else {
            containerDireita.innerHTML = "<p>Não há dados suficientes para estes indicadores.</p>";
        }

    } else {
        // --- MODO: VISÃO GERAL --- (Para todos os outros casos)
        tituloGraficoEsquerda.textContent = 'Gasto por Empresa (%) na Seleção';
        tituloPainelDireita.textContent = 'Top 5 Custos na Seleção';
        
        containerDireita.innerHTML = '<canvas id="graficoEvolucaoMensal"></canvas>';

        const gastosPorEmpresa = dadosParaVisao.reduce((acc, item) => {
            if (!acc[item.Empresa]) { acc[item.Empresa] = 0; }
            acc[item.Empresa] += Number(item.ValorGasto || 0);
            return acc;
        }, {});

        const labelsEmpresas = Object.keys(gastosPorEmpresa);
        const dataEmpresas = Object.values(gastosPorEmpresa);
        renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto na Seleção por Empresa');
        
        const top5Gastos = Object.entries(gastosPorEmpresa).sort(([, a], [, b]) => b - a).slice(0, 5);
        const labelsTop5 = top5Gastos.map(item => item[0]);
        const dataTop5 = top5Gastos.map(item => item[1]);
        renderizarGrafico('graficoEvolucaoMensal', 'bar', labelsTop5, dataTop5, 'Maiores Custos na Seleção');
    }
}


// =======================================================
// --- FUNÇÕES AUXILIARES ---
// =======================================================
async function carregarDados(url) {
    try {
        const resposta = await fetch(url);
        const textoCsv = await resposta.text();
        const { data } = Papa.parse(textoCsv, { header: true, dynamicTyping: true, skipEmptyLines: true });
        return data;
    } catch (erro) {
        console.error(`Erro ao carregar dados da URL: ${url}`, erro);
        return null;
    }
}

function renderizarGrafico(canvasId, tipo, labels, data, labelDataset) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');
    
    if (canvas.chart) { canvas.chart.destroy(); }

    const corTextoEixos = '#bdc3c7';
    const backgroundColors = labels.map(label => mapaDeCores[label] || '#cccccc');

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: tipo === 'pie',
                position: 'right',
                labels: { color: corTextoEixos }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const valor = context.parsed.y || context.parsed;
                        if (context.chart.config.type === 'pie') {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const porcentagem = total > 0 ? ((valor / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${formatarMoeda(valor)} (${porcentagem}%)`;
                        }
                        return `${context.dataset.label}: ${formatarMoeda(valor)}`;
                    }
                }
            }
        },
        scales: (tipo === 'bar' || tipo === 'line') ? {
            x: { ticks: { color: corTextoEixos }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            y: { ticks: { color: corTextoEixos, callback: (value) => formatarMoeda(value) }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
        } : {}
    };

    canvas.chart = new Chart(ctx, {
        type: tipo,
        data: {
            labels: labels,
            datasets: [{
                label: labelDataset,
                data: data,
                backgroundColor: tipo === 'line' ? '#3498db50' : backgroundColors,
                borderColor: tipo === 'line' ? '#3498db' : backgroundColors,
                borderWidth: tipo === 'line' ? 2 : 1,
                fill: tipo === 'line'
            }]
        },
        options: chartOptions
    });
}

function formatarMoeda(valor) {
    if (typeof valor !== 'number') return valor;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function iniciarRotacao(intervalo) {
    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return;

    let telaAtual = 0;
    setInterval(() => {
        telas[telaAtual].classList.remove('ativo');
        telaAtual = (telaAtual + 1) % telas.length;
        telas[telaAtual].classList.add('ativo');
    }, intervalo);
}