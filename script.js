// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================

const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv';

const MESES_ORDENADOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// --- NOVA VARIÁVEL GLOBAL ---
// Esta variável vai guardar todos os dados da planilha para que possamos filtrá-los várias vezes.
let todosOsDados = [];


// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================

document.addEventListener('DOMContentLoaded', iniciarDashboard);

/**
 * Orquestra o carregamento dos dados, a configuração dos filtros e a renderização inicial do painel.
 */
async function iniciarDashboard() {
    // 1. Carrega os dados da nossa planilha e guarda na variável global.
    todosOsDados = await carregarDados(URL_CUSTOS_FIXOS);

    // 2. Se os dados foram carregados com sucesso...
    if (todosOsDados && todosOsDados.length > 0) {
        // ...começa a configurar a interatividade.
        popularFiltros(todosOsDados);
        configurarEventListeners(todosOsDados);

        // Renderiza o dashboard pela primeira vez com a visão geral do ano atual.
        atualizarDashboard(todosOsDados, { mes: 'Todos', empresa: 'Todos' });
    } else {
        console.error("Não foi possível renderizar o painel: Nenhum dado foi carregado ou a planilha está vazia.");
    }

    // 3. Inicia a rotação automática das telas.
    iniciarRotacao(120000);
}


// =======================================================
// --- FUNÇÕES DE CONFIGURAÇÃO DA INTERATIVIDADE ---
// =======================================================

/**
 * Pega os dados da planilha e preenche os menus de seleção (filtros) de Mês e Empresa.
 * @param {Array} dados - A lista completa de dados.
 */
function popularFiltros(dados) {
    const filtroMes = document.getElementById('filtro-mes');
    const filtroEmpresa = document.getElementById('filtro-empresa');

    // Pega listas de meses e empresas únicos dos dados.
    const mesesUnicos = [...new Set(dados.map(item => item.Mes))].sort((a, b) => MESES_ORDENADOS.indexOf(a) - MESES_ORDENADOS.indexOf(b));
    const empresasUnicas = [...new Set(dados.map(item => item.Empresa))].sort();

    // Adiciona a opção "Todos" no início de cada filtro.
    filtroMes.innerHTML = '<option value="Todos">Todos</option>';
    filtroEmpresa.innerHTML = '<option value="Todos">Todos</option>';

    // Cria e adiciona uma tag <option> para cada mês.
    mesesUnicos.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes;
        option.textContent = mes;
        filtroMes.appendChild(option);
    });

    // Cria e adiciona uma tag <option> para cada empresa.
    empresasUnicas.forEach(empresa => {
        const option = document.createElement('option');
        option.value = empresa;
        option.textContent = empresa;
        filtroEmpresa.appendChild(option);
    });
}

/**
 * Adiciona os "ouvintes de eventos" aos nossos botões de filtro.
 * @param {Array} dados - A lista completa de dados.
 */
function configurarEventListeners(dados) {
    const botaoFiltrar = document.getElementById('botao-filtrar');

    // Diz ao botão para executar uma ação quando for clicado.
    botaoFiltrar.addEventListener('click', () => {
        // Pega os valores selecionados nos menus.
        const mesSelecionado = document.getElementById('filtro-mes').value;
        const empresaSelecionada = document.getElementById('filtro-empresa').value;

        // Monta um objeto com os filtros escolhidos.
        const filtros = {
            mes: mesSelecionado,
            empresa: empresaSelecionada
        };

        // Chama a função principal de renderização, passando os novos filtros.
        atualizarDashboard(dados, filtros);
    });
}


// =======================================================
// --- FUNÇÃO CENTRAL DE ATUALIZAÇÃO DO DASHBOARD ---
// =======================================================

/**
 * Função central que filtra os dados e redesenha todos os elementos da tela.
 * @param {Array} dados - A lista completa de dados.
 * @param {Object} filtros - Um objeto com as seleções do usuário, ex: { mes: 'Abril', empresa: 'Todos' }.
 */
function atualizarDashboard(dados, filtros) {
    const anoAtual = new Date().getFullYear();

    // --- 1. APLICAÇÃO DOS FILTROS ---
    let dadosFiltrados = dados.filter(d => Number(d.Ano) === anoAtual);

    if (filtros.mes !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(d => d.Mes && d.Mes.trim() === filtros.mes);
    }
    if (filtros.empresa !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
    }
    
    // --- 2. ATUALIZAÇÃO DOS CARDS ---
    // O card de "Custo Anual Total" e "Custo Médio Mensal" sempre consideram o ano todo, sem filtro.
    const dadosAnoInteiro = dados.filter(d => Number(d.Ano) === anoAtual);
    const custoAnualTotal = dadosAnoInteiro.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);
    const mesesPassados = new Date().getMonth() + 1;
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;
    
    // O card "Custo do Mês" agora mostra o custo do que foi filtrado.
    const custoSelecaoAtual = dadosFiltrados.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);
    
    document.querySelector('#custo-anual-total-card h3').textContent = `Custo Anual Total (${anoAtual})`;
    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);

    // Muda o título e o valor do card do meio para refletir a seleção.
    document.querySelector('#custo-mes-atual-card h3').textContent = `Custo da Seleção`;
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoSelecaoAtual);
    
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);

    // --- 3. ATUALIZAÇÃO DOS GRÁFICOS ---
    // Os gráficos agora são baseados nos dados JÁ FILTRADOS.
    const gastosPorEmpresa = dadosFiltrados.reduce((acc, item) => {
        if (!acc[item.Empresa]) { acc[item.Empresa] = 0; }
        acc[item.Empresa] += Number(item.ValorGasto || 0);
        return acc;
    }, {});
    
    const labelsEmpresas = Object.keys(gastosPorEmpresa);
    const dataEmpresas = Object.values(gastosPorEmpresa);
    renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto na Seleção por Empresa');
    
    const top5Gastos = Object.entries(gastosPorEmpresa)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
        
    const labelsTop5 = top5Gastos.map(item => item[0]);
    const dataTop5 = top5Gastos.map(item => item[1]);
    renderizarGrafico('graficoEvolucaoMensal', 'bar', labelsTop5, dataTop5,  'Maiores Custos na Seleção');
}


// =======================================================
// --- FUNÇÕES AUXILIARES (permanecem as mesmas) ---
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
    const CORES_GRAFICO = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22'];

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
        scales: (tipo === 'bar') ? {
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
                backgroundColor: CORES_GRAFICO,
                borderColor: CORES_GRAFICO,
                borderWidth: 1
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