// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================

// URL do CSV público do Google Sheets com os dados de custos fixos
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv';

// Array com os meses do ano em ordem
const MESES_ORDENADOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Variável global para armazenar todos os dados carregados
let todosOsDados = [];

// Paleta de cores para os gráficos
const PALETA_DE_CORES = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22', '#055bb1ff', '#f39c12', '#d35400', '#c0392b', '#8e44ad', '#2980b9', '#27ae60', '#d35400'];

// Mapa para associar empresas a cores
const mapaDeCores = {};

// --- VARIÁVEIS PARA CONTROLAR A ROTAÇÃO ---
let temporizadorRotacao = null;
let temporizadorInatividade = null;
const TEMPO_DE_INATIVIDADE = 120000; // 2 minutos em milissegundos.


// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================

// Aguarda o carregamento do DOM para iniciar o dashboard
document.addEventListener('DOMContentLoaded', iniciarDashboard);

async function iniciarDashboard() {
    // Carrega os dados do Google Sheets
    todosOsDados = await carregarDados(URL_CUSTOS_FIXOS);

    if (todosOsDados && todosOsDados.length > 0) {
        gerarMapaDeCores(todosOsDados); // Gera o mapa de cores para as empresas
        popularFiltros(todosOsDados);   // Preenche os filtros de mês e empresa
        configurarEventListeners(todosOsDados); // Configura os eventos dos filtros
    
        atualizarDashboard(todosOsDados, { mes: 'Todos', empresa: 'Todos' }); // Atualiza o dashboard com todos os dados
        
        iniciarRotacaoAutomatica(); // Inicia a rotação automática das telas
        configurarSensorDeAtividade(); // Configura o sensor de atividade do usuário

    } else {
        console.error("Não foi possível renderizar o painel: Nenhum dado foi carregado ou a planilha está vazia.");
    }
}


// =======================================================
// --- FUNÇÕES DE ROTAÇÃO E ATIVIDADE ---
// =======================================================

// Inicia a rotação automática entre as telas do dashboard
function iniciarRotacaoAutomatica() {
    if (temporizadorRotacao) clearInterval(temporizadorRotacao);

    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return;

    let telaAtual = 0;
    telas.forEach((tela, index) => {
        if (tela.classList.contains('ativo')) {
            telaAtual = index;
        }
    });

    temporizadorRotacao = setInterval(() => {
        telas[telaAtual].classList.remove('ativo');
        telaAtual = (telaAtual + 1) % telas.length;
        telas[telaAtual].classList.add('ativo');
    }, 10000); // Troca de tela a cada 10 segundos
}

// Reinicia o timer de inatividade ao detectar atividade do usuário
function reiniciarTimerDeInatividade() {
    clearInterval(temporizadorRotacao);
    clearTimeout(temporizadorInatividade);

    temporizadorInatividade = setTimeout(() => {
        iniciarRotacaoAutomatica();
    }, TEMPO_DE_INATIVIDADE);
}

// Configura o sensor para detectar atividade do mouse
function configurarSensorDeAtividade() {
    window.addEventListener('mousemove', reiniciarTimerDeInatividade);
}


// =======================================================
// --- FUNÇÕES DE CONFIGURAÇÃO E LÓGICA ---
// =======================================================

// Gera o mapa de cores associando cada empresa a uma cor da paleta
function gerarMapaDeCores(dados) {
    const empresasUnicas = [...new Set(dados.map(item => item.Empresa.trim()))].sort();
    empresasUnicas.forEach((empresa, index) => {
        mapaDeCores[empresa] = PALETA_DE_CORES[index % PALETA_DE_CORES.length];
    });
}

// Preenche os filtros de mês e empresa com base nos dados do ano atual
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

// Configura o evento do botão de filtro para atualizar o dashboard
function configurarEventListeners(dados) {
    const botaoFiltrar = document.getElementById('botao-filtrar');
    botaoFiltrar.addEventListener('click', () => {
        const mesSelecionado = document.getElementById('filtro-mes').value;
        const empresaSelecionada = document.getElementById('filtro-empresa').value;
        const filtros = { mes: mesSelecionado, empresa: empresaSelecionada };
        atualizarDashboard(dados, filtros);
    });
}

// A função configurarSidebar() foi completamente REMOVIDA.


// Atualiza os cards e gráficos do dashboard conforme os filtros selecionados
function atualizarDashboard(dados, filtros) {
    const anoAtual = new Date().getFullYear();
    const dadosAnoInteiro = dados.filter(d => Number(d.Ano) === anoAtual);
    
    let dadosParaVisao = [...dadosAnoInteiro];

    // Filtra por mês, se necessário
    if (filtros.mes !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Mes && d.Mes.trim() === filtros.mes);
    }
    // Filtra por empresa, se necessário
    if (filtros.empresa !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
    }

    // Calcula os indicadores principais
    const custoAnualTotal = dadosAnoInteiro.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);
    const mesesPassados = new Date().getMonth() + 1;
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;
    const custoSelecaoAtual = dadosParaVisao.reduce((soma, item) => soma + Number(item.ValorGasto || 0), 0);

    // Atualiza os cards de indicadores
    document.querySelector('#custo-anual-total-card h3').textContent = `Custo Anual Total (${anoAtual})`;
    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.querySelector('#custo-mes-atual-card h3').textContent = `Custo da Seleção`;
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoSelecaoAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);

    // Seletores dos títulos e containers dos gráficos
    const tituloGraficoEsquerda = document.querySelector('#graficoAnualEmpresas').closest('.grafico-wrapper').querySelector('h4');
    const tituloPainelDireita = document.getElementById('titulo-wrapper-direita');
    const containerDireita = document.getElementById('container-direita');

    // Se uma empresa foi selecionada, mostra evolução mensal e KPIs específicos
    if (filtros.empresa !== 'Todos') {
        tituloGraficoEsquerda.textContent = `Evolução Mensal - ${filtros.empresa}`;
        tituloPainelDireita.textContent = `Indicadores Chave - ${filtros.empresa}`;

        const dadosDaEmpresaNoAno = dadosAnoInteiro.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
        
        // Monta array de gastos mensais para a empresa selecionada
        const gastosMensais = Array(12).fill(0);
        dadosDaEmpresaNoAno.forEach(item => {
            const indiceMes = MESES_ORDENADOS.indexOf(item.Mes.trim());
            if (indiceMes !== -1) {
                gastosMensais[indiceMes] = Number(item.ValorGasto || 0);
            }
        });
        renderizarGrafico('graficoAnualEmpresas', 'line', MESES_ORDENADOS, gastosMensais, `Custo Mensal de ${filtros.empresa}`);

        // Calcula KPIs: média, maior e menor custo mensal
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
        // Se nenhuma empresa foi selecionada, mostra gráfico de pizza e top 5 custos
        tituloGraficoEsquerda.textContent = 'Gasto por Empresa (%) na Seleção';
        tituloPainelDireita.textContent = 'Top 5 Custos na Seleção';
        
        containerDireita.innerHTML = '<canvas id="graficoEvolucaoMensal"></canvas>';

        // Calcula o gasto total por empresa
        const gastosPorEmpresa = dadosParaVisao.reduce((acc, item) => {
            if (!acc[item.Empresa]) { acc[item.Empresa] = 0; }
            acc[item.Empresa] += Number(item.ValorGasto || 0);
            return acc;
        }, {});

        const labelsEmpresas = Object.keys(gastosPorEmpresa);
        const dataEmpresas = Object.values(gastosPorEmpresa);
        renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto na Seleção por Empresa');
        
        // Top 5 empresas com maiores custos
        const top5Gastos = Object.entries(gastosPorEmpresa).sort(([, a], [, b]) => b - a).slice(0, 5);
        const labelsTop5 = top5Gastos.map(item => item[0]);
        const dataTop5 = top5Gastos.map(item => item[1]);
        renderizarGrafico('graficoEvolucaoMensal', 'bar', labelsTop5, dataTop5, 'Maiores Custos na Seleção');
    }
}

// Carrega os dados CSV da URL e converte para array de objetos
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

// Renderiza um gráfico Chart.js no canvas especificado
function renderizarGrafico(canvasId, tipo, labels, data, labelDataset) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');
    
    // Destroi gráfico anterior, se existir
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

// Formata um valor numérico para moeda brasileira (BRL)
function formatarMoeda(valor) {
    if (typeof valor !== 'number') return valor;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}