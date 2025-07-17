// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================

// URL da planilha de custos fixos publicada como CSV.
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv';

// Pega a data atual do sistema para tornar o dashboard dinâmico.
const DATA_ATUAL = new Date();
const ANO_ATUAL = DATA_ATUAL.getFullYear(); // Extrai o ano atual (ex: 2024).
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MES_ATUAL = MESES[DATA_ATUAL.getMonth()]; // Extrai o nome do mês atual (ex: "Julho").


// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================

/**
 * Função principal que é executada assim que o HTML da página é carregado.
 * Ela coordena o início de todo o processo.
 */
document.addEventListener('DOMContentLoaded', iniciarDashboard);

/**
 * Orquestra o carregamento dos dados e a renderização inicial do painel.
 */
async function iniciarDashboard() {
    // 1. Carrega os dados da nossa planilha.
    const dadosCustosFixos = await carregarDados(URL_CUSTOS_FIXOS);

    // 2. Se os dados foram carregados com sucesso...
    if (dadosCustosFixos && dadosCustosFixos.length > 0) {
        // ...chama a função para desenhar o painel pela primeira vez.
        renderizarPainelCustosFixos(dadosCustosFixos);
    } else {
        // ...ou mostra um erro se não houver dados.
        console.error("Não foi possível renderizar o painel: Nenhum dado foi carregado ou a planilha está vazia.");
    }

    // 3. Inicia a rotação automática das telas.
    iniciarRotacao(120000); // Rotação a cada 2 minutos.
}


// =======================================================
// --- FUNÇÕES PRINCIPAIS DE LÓGICA ---
// =======================================================

/**
 * Busca e processa os dados da planilha (arquivo CSV).
 * @param {string} url - O link da planilha publicada.
 * @returns {Promise<Array|null>} Uma lista de objetos com os dados, ou nulo em caso de erro.
 */
async function carregarDados(url) {
    // Bloco 'try...catch' para capturar qualquer erro de rede ou de processamento.
    try {
        const resposta = await fetch(url); // Faz a requisição web para a URL.
        const textoCsv = await resposta.text(); // Converte a resposta em texto puro.
        // Usa a biblioteca PapaParse para transformar o texto CSV em uma estrutura de dados organizada.
        const { data } = Papa.parse(textoCsv, {
            header: true,          // A primeira linha do CSV é o cabeçalho.
            dynamicTyping: true,   // Tenta converter tipos de dados (números, etc.) automaticamente.
            skipEmptyLines: true   // Ignora linhas vazias.
        });
        return data; // Retorna os dados prontos para uso.
    } catch (erro) {
        console.error(`Erro ao carregar dados da URL: ${url}`, erro);
        return null;
    }
}

/**
 * Processa os dados de custos fixos e atualiza a tela com os cards e gráficos.
 * @param {Array} dados - A lista de dados completa vinda da planilha.
 */
function renderizarPainelCustosFixos(dados) {
    // Atualiza os títulos dos cards para refletir o ano e mês atuais.
    document.querySelector('#custo-anual-total-card h3').textContent = `Custo Anual Total (${ANO_ATUAL})`;
    document.querySelector('#custo-mes-atual-card h3').textContent = `Custo Mês Atual (${MES_ATUAL})`;

    // Garante que o 'Ano' seja tratado como número para a filtragem.
    const dadosAnoAtual = dados.filter(d => Number(d.Ano) === ANO_ATUAL);
    
    // Garante que o 'Mes' seja comparado sem espaços em branco.
    const dadosMesAtual = dadosAnoAtual.filter(d => d.Mes && d.Mes.trim() === MES_ATUAL);

    // Calcula os totais, garantindo que o 'ValorGasto' seja tratado como número.
    const custoAnualTotal = dadosAnoAtual.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);
    const custoMesAtual = dadosMesAtual.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);
    const mesesPassados = MESES.indexOf(MES_ATUAL) + 1;
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;

    // Atualiza os valores nos parágrafos dos cards.
    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoMesAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);

    // Agrupa os gastos por empresa para montar os gráficos.
    const gastosPorEmpresa = dadosAnoAtual.reduce((acc, item) => {
        if (!acc[item.Empresa]) { acc[item.Empresa] = 0; }
        acc[item.Empresa] += Number(item.ValorGasto || 0);
        return acc;
    }, {});
    
    // Prepara os dados e renderiza o gráfico de Pizza.
    const labelsEmpresas = Object.keys(gastosPorEmpresa);
    const dataEmpresas = Object.values(gastosPorEmpresa);
    renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto Anual por Empresa');
    
    // Prepara os dados e renderiza o gráfico de Barras com o Top 5.
    const top5Gastos = Object.entries(gastosPorEmpresa)
        .sort(([, a], [, b]) => b - a) // Ordena do maior para o menor.
        .slice(0, 5); // Pega os 5 primeiros.
        
    const labelsTop5 = top5Gastos.map(item => item[0]);
    const dataTop5 = top5Gastos.map(item => item[1]);
    renderizarGrafico('graficoEvolucaoMensal', 'bar', labelsTop5, dataTop5,  '5 Maiores Custos');
}

/**
 * Função genérica e reutilizável para desenhar qualquer tipo de gráfico usando a biblioteca Chart.js.
 * @param {string} canvasId - O id do elemento <canvas> no HTML.
 * @param {string} tipo - O tipo de gráfico (ex: 'pie', 'bar').
 * @param {Array} labels - Os nomes para cada fatia ou barra.
 * @param {Array} data - Os valores numéricos para cada fatia ou barra.
 * @param {string} labelDataset - O título do conjunto de dados (usado em dicas).
 */
function renderizarGrafico(canvasId, tipo, labels, data, labelDataset) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { return; } // Verificação de segurança.
    const ctx = canvas.getContext('2d');
    
    // Se já existir um gráfico neste canvas, destrói ele antes de criar um novo. Evita bugs.
    if (canvas.chart) { canvas.chart.destroy(); }

    const corTextoEixos = '#bdc3c7';
    const CORES_GRAFICO = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22'];

    // Objeto com todas as opções de customização para os gráficos.
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
                            const porcentagem = ((valor / total) * 100).toFixed(1);
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

    // Cria o novo gráfico com os dados e opções.
    canvas.chart = new Chart(ctx, {
        type: tipo,
        data: {
            labels: labels,
            datasets: [{
                label: labelDataset,
                data: data,
                backgroundColor: CORES_GRAFICO,
                borderColor: CORES_GRAFICO,
                borderWidth: 1
            }]
        },
        options: chartOptions
    });
}


// =======================================================
// --- FUNÇÕES AUXILIARES ---
// =======================================================

/**
 * Formata um número como moeda brasileira (BRL).
 * @param {number} valor - O número a ser formatado.
 * @returns {string} O valor formatado como "R$ 1.234,56".
 */
function formatarMoeda(valor) {
    if (typeof valor !== 'number') return valor;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Controla a rotação automática entre as diferentes telas do dashboard.
 * @param {number} intervalo - O tempo em milissegundos para trocar de tela.
 */
function iniciarRotacao(intervalo) {
    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return; // Não faz nada se só tiver uma tela.

    let telaAtual = 0;
    setInterval(() => {
        telas[telaAtual].classList.remove('ativo');
        telaAtual = (telaAtual + 1) % telas.length;
        telas[telaAtual].classList.add('ativo');
    }, intervalo);
}