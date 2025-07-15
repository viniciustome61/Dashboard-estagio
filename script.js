// --- CONFIGURAÇÃO INICIAL ---
const URL_CUSTOS_FIXOS = 'URL_DA_SUA_PLANILHA_DE_CUSTOS_FIXOS_AQUI';
// Mantenha as outras URLs quando for usar os dados de orçamento e contratos
// const URL_ORCAMENTO = 'URL_DA_SUA_PLANILHA_DE_ORCAMENTO_AQUI';
// const URL_CONTRATOS = 'URL_DA_SUA_PLANILHA_DE_CONTRATOS_AQUI';

const ANO_ATUAL = 2025;
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MES_ATUAL = "Julho"; // Ajuste este mês conforme necessário

// --- PONTO DE PARTIDA ---
document.addEventListener('DOMContentLoaded', iniciarDashboard);

async function iniciarDashboard() {
    const dadosCustosFixos = await carregarDados(URL_CUSTOS_FIXOS);
    
    if (dadosCustosFixos) {
        renderizarPainelCustosFixos(dadosCustosFixos);
    }
    
    iniciarRotacao(20000); 
}

// --- FUNÇÃO DE CARREGAMENTO DE DADOS ---
async function carregarDados(url) {
    if (!url || url.includes('URL_DA_SUA_PLANILHA')) {
        console.warn(`URL não configurada: ${url}`);
        return null;
    }
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

// --- FUNÇÃO DE RENDERIZAÇÃO PARA CUSTOS FIXOS ---
function renderizarPainelCustosFixos(dados) {
    const dadosAnoAtual = dados.filter(d => d.Ano === ANO_ATUAL);

    const custoAnualTotal = dadosAnoAtual.reduce((soma, item) => soma + item.ValorGasto, 0);
    const custoMesAtual = dadosAnoAtual.filter(d => d.Mes === MES_ATUAL).reduce((soma, item) => soma + item.ValorGasto, 0);
    const mesesPassados = MESES.indexOf(MES_ATUAL) + 1;
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;

    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoMesAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);

    const gastosPorEmpresa = dadosAnoAtual.reduce((acc, item) => {
        if (!acc[item.Empresa]) { acc[item.Empresa] = 0; }
        acc[item.Empresa] += item.ValorGasto;
        return acc;
    }, {});

    const labelsEmpresas = Object.keys(gastosPorEmpresa);
    const dataEmpresas = Object.values(gastosPorEmpresa);
    renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto Anual por Empresa');
    
    const top5Gastos = Object.entries(gastosPorEmpresa)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    const labelsTop5 = top5Gastos.map(item => item[0]);
    const dataTop5 = top5Gastos.map(item => item[1]);
    renderizarGrafico('graficoEvolucaoMensal', 'bar', labelsTop5, dataTop5, 'Top 5 Maiores Custos');
}


// --- FUNÇÃO GENÉRICA PARA RENDERIZAR GRÁFICOS (VERSÃO MODIFICADA) ---
function renderizarGrafico(canvasId, tipo, labels, data, labelDataset) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Elemento canvas com id "${canvasId}" não foi encontrado.`);
        return;
    }
    const ctx = canvas.getContext('2d');
    
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    const corTextoEixos = '#bdc3c7';
    // Lista de cores que será usada tanto na pizza quanto nas barras
    const CORES_GRAFICO = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22', '#34495e', '#f39c12', '#d35400', '#c0392b', '#8e44ad', '#2980b9'];

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: tipo === 'pie',
                position: 'right',
                labels: {
                    color: corTextoEixos,
                    boxWidth: 20,
                    padding: 15
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const valor = context.parsed.y || context.parsed;
                        if (context.chart.config.type === 'pie') {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const porcentagem = ((valor / total) * 100).toFixed(1);
                            return `${context.label}: ${formatarMoeda(valor)} (${porcentagem}%)`;
                        }
                        return `${context.dataset.label}: ${formatarMoeda(valor)}`;
                    }
                }
            }
        },
        scales: (tipo === 'bar' || tipo === 'line') ? {
            x: {
                ticks: { color: corTextoEixos },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            },
            y: {
                ticks: {
                    color: corTextoEixos,
                    callback: function(value) { return formatarMoeda(value); }
                },
                grid: { color: 'rgba(255, 255, 255, 0.1)' }
            }
        } : {}
    };

    canvas.chart = new Chart(ctx, {
        type: tipo,
        data: {
            labels: labels,
            datasets: [{
                label: labelDataset,
                data: data,
                // A MUDANÇA ESTÁ AQUI: Usa a lista de cores para todos os gráficos
                backgroundColor: CORES_GRAFICO,
                borderColor: CORES_GRAFICO, // Usa a mesma lista para as bordas
                borderWidth: 1
            }]
        },
        options: chartOptions
    });
}


// --- FUNÇÃO AUXILIAR PARA FORMATAR MOEDA ---
function formatarMoeda(valor) {
    if (typeof valor !== 'number') return valor;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- FUNÇÃO DE ROTAÇÃO DAS TELAS ---
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