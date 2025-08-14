// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv';
const URL_PAINEL_VEICULOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgHtViC2nIILt8CvDtm_QQvcPmgWyNMhvfCxSFe7e6V26V6nV6El2k_t8bYcidgCsJjCnsV9C0IaPJ/pub?output=csv';
const URL_COMBUSTIVEL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1_Cwkcog1mJahMhTfLdrwtyWyTPE54CuR99bodFgnJCauwZ0DZ2-9poonfKTwfC5jG2Kci53OGhJV/pub?output=csv';

const REVISAO_INTERVALO_KM = 10000;
const REVISAO_ALERTA_KM = 2000;
const MESES_ORDENADOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

let todosOsDadosCustos = [];
let todosOsDadosVeiculos = [];
let todosOsDadosCombustivel = [];

const PALETA_DE_CORES = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22', '#055bb1ff', '#f39c12', '#d35400', '#c0392b', '#8e44ad', '#2980b9', '#27ae60', '#d35400'];
const mapaDeCores = {};

let temporizadorRotacao = null;
let temporizadorInatividade = null;
const TEMPO_DE_INATIVIDADE = 120000;


// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================
document.addEventListener('DOMContentLoaded', iniciarDashboard);

async function iniciarDashboard() {
    [todosOsDadosCustos, todosOsDadosVeiculos, todosOsDadosCombustivel] = await Promise.all([
        carregarDados(URL_CUSTOS_FIXOS),
        carregarDados(URL_PAINEL_VEICULOS),
        carregarDados(URL_COMBUSTIVEL)
    ]);

    if (todosOsDadosCustos) {
        gerarMapaDeCores(todosOsDadosCustos);
        popularFiltros(todosOsDadosCustos);
        configurarEventListeners(todosOsDadosCustos);
    }
    
    iniciarRotacao(20000);
    configurarSensorDeAtividade();
}


// =======================================================
// --- FUNÇÕES DE ROTAÇÃO E ATIVIDADE ---
// =======================================================

function iniciarRotacao(intervalo) {
    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return;
    let telaAtual = 0;
    
    const executarAtualizacoes = () => {
        const telaAtiva = telas[telaAtual];
        
        if (telaAtiva.id === 'dashboard-custos-fixos' && todosOsDadosCustos) {
            atualizarDashboard(todosOsDadosCustos, { mes: 'Todos', empresa: 'Todos' });
        
        } else if (telaAtiva.id === 'dashboard-frota' && todosOsDadosVeiculos && todosOsDadosCombustivel) {
            renderizarPainelFrota(todosOsDadosVeiculos, todosOsDadosCombustivel);
        }
    };

    executarAtualizacoes();

    temporizadorRotacao = setInterval(() => {
        telas[telaAtual].classList.remove('ativo');
        telaAtual = (telaAtual + 1) % telas.length;
        telas[telaAtual].classList.add('ativo');
        executarAtualizacoes();
    }, intervalo);
}

function reiniciarTimerDeInatividade() {
    clearInterval(temporizadorRotacao);
    clearTimeout(temporizadorInatividade);
    temporizadorInatividade = setTimeout(() => {
        iniciarRotacao(20000);
    }, TEMPO_DE_INATIVIDADE);
}

function configurarSensorDeAtividade() {
    window.addEventListener('mousemove', reiniciarTimerDeInatividade);
}


// =======================================================
// --- FUNÇÕES DE LÓGICA ---
// =======================================================

async function carregarDados(url) {
    if (!url || url.includes('URL_')) { return null; }
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) { throw new Error(`Falha na rede: ${resposta.statusText}`); }
        const textoCsv = await resposta.text();
        const { data } = Papa.parse(textoCsv, { header: true, skipEmptyLines: true });
        return data;
    } catch (erro) {
        console.error(`Erro ao carregar dados da URL: ${url}`, erro);
        return null;
    }
}

/**
 * FUNÇÃO ATUALIZADA: Converte uma string de moeda (ex: "R$ 1.330,00" ou "1330.00") para um número (1330.00).
 * @param {string|number} valor - O valor vindo da planilha.
 * @returns {number} - O valor convertido para um número.
 */
function parseNumerico(valor) {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string' || !valor.trim()) return 0;

    const valorStr = String(valor).trim().replace("R$", "").trim();
    
    if (valorStr.includes(',')) {
        return parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(valorStr);
}

function formatarMoeda(valor) {
    if (typeof valor !== 'number' || isNaN(valor)) return "R$ 0,00";
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- Funções da Tela de Custos Fixos ---
function gerarMapaDeCores(dados) {
    const empresasUnicas = [...new Set(dados.filter(item => item.Empresa).map(item => item.Empresa.trim()))].sort();
    empresasUnicas.forEach((empresa, index) => {
        mapaDeCores[empresa] = PALETA_DE_CORES[index % PALETA_DE_CORES.length];
    });
}

function popularFiltros(dados) {
    const filtroMes = document.getElementById('filtro-mes');
    const filtroEmpresa = document.getElementById('filtro-empresa');
    if(!filtroMes || !filtroEmpresa) return;

    const anoAtual = new Date().getFullYear();
    const dadosAnoAtual = dados.filter(d => Number(d.Ano) === anoAtual);
    const mesesUnicos = [...new Set(dadosAnoAtual.filter(item => item.Mes).map(item => item.Mes.trim()))].sort((a, b) => MESES_ORDENADOS.indexOf(a) - MESES_ORDENADOS.indexOf(b));
    const empresasUnicas = [...new Set(dadosAnoAtual.filter(item => item.Empresa).map(item => item.Empresa.trim()))].sort();

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
    if(!botaoFiltrar) return;
    botaoFiltrar.addEventListener('click', () => {
        const mesSelecionado = document.getElementById('filtro-mes').value;
        const empresaSelecionada = document.getElementById('filtro-empresa').value;
        const filtros = { mes: mesSelecionado, empresa: empresaSelecionada };
        atualizarDashboard(todosOsDadosCustos, filtros);
    });
}

function atualizarDashboard(dados, filtros) {
    const anoAtual = new Date().getFullYear();
    const dadosAnoInteiro = dados.filter(d => parseNumerico(d.Ano) === anoAtual);
    let dadosParaVisao = [...dadosAnoInteiro];
    
    if (filtros.mes !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Mes && d.Mes.trim() === filtros.mes);
    }
    if (filtros.empresa !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
    }
    
    const custoAnualTotal = dadosAnoInteiro.reduce((soma, item) => soma + parseNumerico(item.ValorGasto), 0);
    const mesesPassados = new Date().getMonth() + 1;
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;
    const custoSelecaoAtual = dadosParaVisao.reduce((soma, item) => soma + parseNumerico(item.ValorGasto), 0);
    
    document.querySelector('#custo-anual-total-card h3').textContent = `Custo Anual Total (${anoAtual})`;
    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.querySelector('#custo-mes-atual-card h3').textContent = `Custo da Seleção`;
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoSelecaoAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);
    
    const tituloGraficoEsquerda = document.querySelector('#titulo-grafico-esquerda');
    const tituloPainelDireita = document.getElementById('titulo-wrapper-direita');
    const containerDireita = document.getElementById('container-direita');

    if (filtros.empresa !== 'Todos') {
        tituloGraficoEsquerda.textContent = `Evolução Mensal - ${filtros.empresa}`;
        tituloPainelDireita.textContent = `Indicadores Chave - ${filtros.empresa}`;
        const dadosDaEmpresaNoAno = dadosAnoInteiro.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
        const gastosMensais = Array(12).fill(0);
        dadosDaEmpresaNoAno.forEach(item => {
            const indiceMes = MESES_ORDENADOS.indexOf(item.Mes.trim());
            if (indiceMes !== -1) {
                gastosMensais[indiceMes] = parseNumerico(item.ValorGasto);
            }
        });
        renderizarGrafico('graficoAnualEmpresas', 'line', MESES_ORDENADOS, gastosMensais, `Custo Mensal de ${filtros.empresa}`);
        const gastosValidos = dadosDaEmpresaNoAno.map(d => parseNumerico(d.ValorGasto)).filter(v => v > 0);
        if (gastosValidos.length > 0) {
            const media = gastosValidos.reduce((a, b) => a + b, 0) / gastosValidos.length;
            const max = Math.max(...gastosValidos);
            const min = Math.min(...gastosValidos);
            const mesMax = dadosDaEmpresaNoAno.find(d => parseNumerico(d.ValorGasto) === max).Mes;
            const mesMin = dadosDaEmpresaNoAno.find(d => parseNumerico(d.ValorGasto) === min).Mes;
            containerDireita.innerHTML = `<div class="kpi-container"><div class="kpi-card"><h5>Custo Médio Mensal</h5><p>${formatarMoeda(media)}</p></div><div class="kpi-card"><h5>Mês de Maior Custo</h5><p>${mesMax} (${formatarMoeda(max)})</p></div><div class="kpi-card"><h5>Mês de Menor Custo</h5><p>${mesMin} (${formatarMoeda(min)})</p></div></div>`;
        } else {
            containerDireita.innerHTML = "<p>Não há dados suficientes para estes indicadores.</p>";
        }
    } else {
        tituloGraficoEsquerda.textContent = 'Gasto por Empresa (%) na Seleção';
        tituloPainelDireita.textContent = 'Top 5 Custos na Seleção';
        containerDireita.innerHTML = '<canvas id="graficoEvolucaoMensal"></canvas>';
        const gastosPorEmpresa = dadosParaVisao.reduce((acc, item) => {
            if (!acc[item.Empresa]) { acc[item.Empresa] = 0; }
            acc[item.Empresa] += parseNumerico(item.ValorGasto);
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

// --- Funções da Tela de Frota ---
function renderizarPainelFrota(dadosVeiculos, dadosCombustivel) {
    const frotaGrid = document.getElementById('frota-grid');
    if (!frotaGrid) return;
    frotaGrid.innerHTML = '';
    const mesAtual = MESES_ORDENADOS[new Date().getMonth()];

    const dadosCombustivelMes = dadosCombustivel.filter(d => {
        if (!d['Data/Hora']) return false;
        const dataStr = String(d['Data/Hora']);
        const match = dataStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if(!match) return false;
        const mes = parseInt(match[2], 10);
        return MESES_ORDENADOS[mes - 1] === mesAtual;
    });

    const totalLitrosFrota = dadosCombustivelMes.reduce((soma, item) => soma + parseNumerico(item['Total de litros']), 0);
    const custoTotalFrota = dadosCombustivelMes.reduce((soma, item) => soma + parseNumerico(item['Custo total de combustível']), 0);
    const totalKmFrota = dadosCombustivelMes.reduce((soma, item) => soma + parseNumerico(item.Quilometragem), 0);

    document.getElementById('frota-total-litros').textContent = totalLitrosFrota.toFixed(2);
    document.getElementById('frota-custo-total').textContent = formatarMoeda(custoTotalFrota);
    document.getElementById('frota-custo-litro').textContent = totalLitrosFrota > 0 ? formatarMoeda(custoTotalFrota / totalLitrosFrota) : formatarMoeda(0);
    document.getElementById('frota-total-km').textContent = totalKmFrota.toFixed(2);

    dadosVeiculos.forEach(veiculo => {
        const odometro = parseNumerico(veiculo['ODÔMETRO']);
        const ultimaRevisao = parseNumerico(veiculo['ULTIMA REVISÃO (KM)']);
        const proximaRevisao = ultimaRevisao + REVISAO_INTERVALO_KM;
        const kmParaRevisao = proximaRevisao - odometro;

        let statusClasse = 'revisao-ok';
        let statusTexto = `Próxima revisão em ${proximaRevisao.toLocaleString('pt-BR')} km.`;
        let statusMarcador = 'ok';

        if (odometro >= proximaRevisao) {
            statusClasse = 'revisao-atrasada';
            statusTexto = `Revisão ATRASADA! Última em ${ultimaRevisao.toLocaleString('pt-BR')} km.`;
            statusMarcador = 'atrasada';
        } else if (kmParaRevisao <= REVISAO_ALERTA_KM) {
            statusClasse = 'revisao-pendente';
            statusTexto = `Revisão próxima! Faltam ${kmParaRevisao.toLocaleString('pt-BR')} km.`;
            statusMarcador = 'revisar';
        }
        
        const card = document.createElement('div');
        card.className = `veiculo-card ${statusClasse}`;
        card.innerHTML = `<div class="status-revisao ${statusMarcador}" title="${statusTexto}"></div><img src="https://via.placeholder.com/300x200.png?text=${veiculo.Modelo}" alt="${veiculo.Modelo}"><div class="veiculo-info"><h5>${veiculo.Modelo}</h5><p>${veiculo.Placa}</p></div>`;

        card.addEventListener('click', () => { 
            document.getElementById('detalhe-modelo').textContent = veiculo.Modelo;
            document.getElementById('detalhe-placa').textContent = veiculo.Placa;
            document.getElementById('detalhe-chassi').textContent = veiculo.Chassi;
            document.getElementById('detalhe-renavam').textContent = veiculo.Renavam;
            document.getElementById('detalhe-revisao').textContent = statusTexto;
            document.getElementById('frota-detalhes').classList.add('visivel');
         });

        frotaGrid.appendChild(card);
    });

    document.getElementById('fechar-detalhes-frota').addEventListener('click', () => { 
        document.getElementById('frota-detalhes').classList.remove('visivel');
     });
}

// --- FUNÇÃO AUXILIAR PARA GRÁFICOS ---
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
            legend: { display: tipo === 'pie', position: 'right', labels: { color: corTextoEixos } },
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