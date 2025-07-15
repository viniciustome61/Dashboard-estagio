// --- CONFIGURAÇÃO INICIAL ---
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv'


const ANO_ATUAL = 2025;
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MES_ATUAL = "Julho";

// --- PONTO DE PARTIDA ---
document.addEventListener('DOMContentLoaded', iniciarDashboard);
async function iniciarDashboard() {
    const dadosCustosFixos = await carregarDados(URL_CUSTOS_FIXOS);
    
    if (dadosCustosFixos) {
        renderizarPainelCustosFixos(dadosCustosFixos);
    }
    
    // Inicia a rotação das telas a cada 20 segundos
    iniciarRotacao(20000); 
}

// --- FUNÇÃO DE CARREGAMENTO DE DADOS (mesma de antes) ---
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

// --- NOVA FUNÇÃO DE RENDERIZAÇÃO PARA CUSTOS FIXOS ---
function renderizarPainelCustosFixos(dados) {
    // 1. Filtra dados para o ano atual
    const dadosAnoAtual = dados.filter(d => d.Ano === ANO_ATUAL);

    // 2. Calcula e renderiza os cards de resumo
    const custoAnualTotal = dadosAnoAtual.reduce((soma, item) => soma + item.ValorGasto, 0);
    const custoMesAtual = dadosAnoAtual.filter(d => d.Mes === MES_ATUAL).reduce((soma, item) => soma + item.ValorGasto, 0);
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / MESES.indexOf(MES_ATUAL) + 1 : 0; // Média até o mês atual

    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoMesAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);

    // 3. Processa dados para o Gráfico Anual por Empresa
    const gastosPorEmpresa = dadosAnoAtual.reduce((acc, item) => {
        if (!acc[item.Empresa]) {
            acc[item.Empresa] = 0;
        }
        acc[item.Empresa] += item.ValorGasto;
        return acc;
    }, {});

    const labelsEmpresas = Object.keys(gastosPorEmpresa);
    const dataEmpresas = Object.values(gastosPorEmpresa);
    renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto Anual');
    
    // 4. Processa dados para o Gráfico de Evolução Mensal
    const gastosPorMes = Array(12).fill(0);
    dadosAnoAtual.forEach(item => {
        const indiceMes = MESES.indexOf(item.Mes);
        if (indiceMes !== -1) {
            gastosPorMes[indiceMes] += item.ValorGasto;
        }
    });

    renderizarGrafico('graficoEvolucaoMensal', 'line', MESES, gastosPorMes, 'Gasto Mensal');
}

// --- FUNÇÃO GENÉRICA PARA RENDERIZAR GRÁFICOS ---
// DEPOIS (A SOLUÇÃO)
function renderizarGrafico(canvasId, tipo, labels, data, labelDataset) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const corTextoEixos = '#bdc3c7'; // Um cinza claro para bom contraste

    new Chart(ctx, {
        type: tipo,
        data: {
            labels: labels,
            datasets: [{
                label: labelDataset,
                data: data,
                backgroundColor: tipo === 'line' ? '#3498db50' : ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22'],
                borderColor: '#3498db',
                fill: tipo === 'line'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: tipo !== 'line',
                    labels: {
                        color: corTextoEixos // Cor do texto da legenda (para o gráfico de pizza)
                    }
                }
            },
            // ADICIONE TODO ESTE BLOCO 'SCALES' ABAIXO
            scales: {
                x: { // Configurações do eixo X (meses)
                    ticks: {
                        color: corTextoEixos // Cor do texto dos meses
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Cor das linhas de grade verticais
                    }
                },
                y: { // Configurações do eixo Y (valores)
                    ticks: {
                        color: corTextoEixos // Cor do texto dos valores
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // Cor das linhas de grade horizontais
                    }
                }
            }
        }
    });
}

// --- FUNÇÃO AUXILIAR PARA FORMATAR MOEDA ---
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- FUNÇÃO DE ROTAÇÃO DAS TELAS (mesma de antes) ---
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