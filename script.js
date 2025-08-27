// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================

// URLs das planilhas Google publicadas como CSV.
// Estas são as URLs corretas e confirmadas.
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv';
const URL_PAINEL_VEICULOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgHtViC2nIILt8CvDtm_QQvcPmgWyNMhvfCxSFe7e6V26V6nV6El2k_t8bYcidgCsJjCnsV9C0IaPJ/pub?output=csv';
const URL_COMBUSTIVEL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1_Cwkcog1mJahMhTfLdrwtyWyTPE54CuR99bodFgnJCauwZ0DZ2-9poonfKTwfC5jG2Kci53OGhJV/pub?output=csv';
const URL_DESEMPENHO_FROTA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSn9z52SmwwstiOq194utY7usOYAKU5yryxM6A1-tAdubIFFSu6OecdHwB6EYresL0HoD02ecVlDDS/pub?gid=612120204&single=true&output=csv'
let todosOsDadosDesempenho = []; // guarda os novos dados 


// --- MELHORIA APLICADA: Caminho das imagens centralizado para fácil manutenção ---
const CAMINHO_IMAGENS = 'Imagens veiculos/';

// --- Parâmetros da Lógica ---

// Define o intervalo em KM para cada revisão periódica.
const REVISAO_INTERVALO_KM = 10000;
// Define quantos KM antes da próxima revisão um alerta deve ser gerado.
const REVISAO_ALERTA_KM = 2000;
// Array com os meses em ordem para facilitar la ordenação e filtros.
const MESES_ORDENADOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Variáveis globais para armazenar os dados carregados das planilhas.
let todosOsDadosCustos = [];
let todosOsDadosVeiculos = [];
let todosOsDadosCombustivel = [];

// Paleta de cores padrão para os gráficos, garantindo consistência visual.
const PALETA_DE_CORES = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22', '#055bb1ff', '#f39c12', '#d35400', '#c0392b', '#8e44ad', '#2980b9', '#27ae60', '#d35400'];
const mapaDeCores = {};

// --- VARIÁVEIS PARA CONTROLAR A ROTAÇÃO DAS TELAS ---
let temporizadorRotacao = null;
let temporizadorInatividade = null;
const TEMPO_DE_INATIVIDADE = 10000; // 10 segundos do tempo de inatividade 


// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================

document.addEventListener('DOMContentLoaded', iniciarDashboard);

// Versão atualizada da função iniciarDashboard
async function iniciarDashboard() {
    try {
        // Adicionamos o carregamento dos novos dados aqui
        [todosOsDadosCustos, todosOsDadosVeiculos, todosOsDadosCombustivel, todosOsDadosDesempenho] = await Promise.all([
            carregarDados(URL_CUSTOS_FIXOS, 'custos'),
            carregarDados(URL_PAINEL_VEICULOS, 'veiculos'),
            carregarDados(URL_COMBUSTIVEL, 'combustivel'),
            carregarDados(URL_DESEMPENHO_FROTA, 'desempenho') 
        ]);

        
        if (todosOsDadosDesempenho) {
            todosOsDadosDesempenho = limparDadosDesempenho(todosOsDadosDesempenho);
            popularFiltrosDesempenho(todosOsDadosDesempenho);
            configurarEventListenerDesempenho();
        }

        if (todosOsDadosCustos) {
            gerarMapaDeCores(todosOsDadosCustos);
            popularFiltros(todosOsDadosCustos);
            configurarEventListeners();
        }
        
        iniciarRotacao(10000); 
        configurarSensorDeAtividade();
    } catch (erro) {
        console.error("Erro fatal ao iniciar o dashboard:", erro);
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `<div class="mensagem-erro">
                <h1>Erro ao carregar os dados</h1>
                <p>Não foi possível carregar os dados das planilhas. Verifique o console (F12) para mais detalhes e certifique-se de que as planilhas estão publicadas corretamente.</p>
            </div>`;
        }
    }
}


// =======================================================
// --- FUNÇÕES DE ROTAÇÃO DE TELA E DETECÇÃO DE ATIVIDADE ---
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

// Versão atualizada do 'executarAtualizacoes' dentro de 'iniciarRotacao'
const executarAtualizacoes = () => {
    const telaAtiva = telas[telaAtual];
    
    if (telaAtiva.id === 'dashboard-custos-fixos' && todosOsDadosCustos) {
        atualizarDashboard(todosOsDadosCustos, { mes: 'Todos', empresa: 'Todos' });
    } else if (telaAtiva.id === 'dashboard-frota' && todosOsDadosVeiculos && todosOsDadosCombustivel) {
        renderizarPainelFrota(todosOsDadosVeiculos, todosOsDadosCombustivel);
    } else if (telaAtiva.id === 'dashboard-desempenho-frota' && todosOsDadosDesempenho) { // <-- ADICIONE ESTE ELSE IF
        atualizarPainelDesempenho();
    }
};


// =======================================================
// --- FUNÇÕES DE LÓGICA E UTILITÁRIOS --- 
// =======================================================

/**
 * Carrega e processa um arquivo CSV de uma URL.
 * Se ocorrer um erro, ele será lançado para ser capturado pelo Promise.all.
 * @param {string} url - A URL do arquivo CSV.
 * @param {string} nomeDados - Um nome descritivo para os dados (para logs de erro).
 * @returns {Promise<Array>} Uma promessa que resolve para os dados processados.
 */
async function carregarDados(url, nomeDados) {
    if (!url || !url.startsWith('https')) {
        console.error(`URL inválida para ${nomeDados}: ${url}`);
        throw new Error(`URL inválida ou ausente para ${nomeDados}`);
    }

    try {
        const resposta = await fetch(url);
        if (!resposta.ok) {
            throw new Error(`Falha na rede ao buscar ${nomeDados} (Status: ${resposta.status} ${resposta.statusText})`);
        }
        
        const textoCsv = await resposta.text();
        const { data } = Papa.parse(textoCsv, { header: true, skipEmptyLines: true });
        
        console.log(`Dados de ${nomeDados} carregados com sucesso.`);
        return data;

    } catch (erro) {
        console.error(`Erro crítico ao carregar ou processar dados de ${nomeDados}:`, erro);
        throw erro;
    }
}

/**
 * Converte um valor (string ou número) para um formato numérico (float).
 * @param {*} valor - O valor a ser convertido.
 * @returns {number} O valor convertido para número.
 */
function parseNumerico(valor) {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string' || !valor.trim()) return 0;
    const valorStr = String(valor).trim();
    if (valorStr.includes(',')) {
        return parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(valorStr);
}

/**
 * Formata um número para o padrão de moeda brasileiro (Real).
 * @param {number} valor - O número a ser formatado.
 * @returns {string} A string formatada como moeda.
 */
function formatarMoeda(valor) {
    if (typeof valor !== 'number' || isNaN(valor)) return "R$ 0,00";
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- Funções da Nova Tela de Desempenho ---

/**
 * Limpa os dados de desempenho, principalmente removendo espaços extras dos nomes das colunas.
 * @param {Array} dados - Os dados brutos da planilha.
 * @returns {Array} Os dados com os nomes das colunas limpos.
 */
function limparDadosDesempenho(dados) {
    return dados.map(item => {
        const itemLimpo = {};
        for (const chave in item) {
            // Remove espaços no início e no fim de cada nome de coluna
            const chaveLimpa = chave.trim();
            itemLimpo[chaveLimpa] = item[chave];
        }
        return itemLimpo;
    });
}

/**
 * Popula os menus de filtro da tela de desempenho com dados únicos da planilha.
 * @param {Array} dados - Os dados de desempenho já limpos.
 */
function popularFiltrosDesempenho(dados) {
    const filtroMes = document.getElementById('filtro-mes-desempenho');
    const filtroDiretoria = document.getElementById('filtro-diretoria-desempenho');
    const filtroVeiculo = document.getElementById('filtro-veiculo-desempenho');
    const filtroMotorista = document.getElementById('filtro-motorista-desempenho');

    // --- CORREÇÃO APLICADA AQUI ---
    // Primeiro, filtramos o array 'dados' para garantir que estamos trabalhando
    // apenas com linhas que realmente têm um valor na coluna 'Data/Hora'.
    const dadosComData = dados.filter(item => item['Data/Hora'] && item['Data/Hora'].trim() !== '');

    // Agora, usamos esse novo array seguro ('dadosComData') para extrair os valores únicos.
    const mesesUnicos = [...new Set(dadosComData.map(item => MESES_ORDENADOS[new Date(item['Data/Hora'].split(' ')[0].split('/').reverse().join('-')).getMonth()]))].sort((a, b) => MESES_ORDENADOS.indexOf(a) - MESES_ORDENADOS.indexOf(b));
    const diretoriasUnicas = [...new Set(dadosComData.map(item => item.Diretoria))].sort();
    const veiculosUnicos = [...new Set(dadosComData.map(item => item.Veiculo))].sort();
    const motoristasUnicos = [...new Set(dadosComData.map(item => item.Motorista))].sort();

    // Função auxiliar para criar as opções (sem alteração)
    const criarOpcoes = (selectElement, opcoes, valorPadrao = 'Todos') => {
        selectElement.innerHTML = `<option value="Todos">${valorPadrao}</option>`;
        opcoes.forEach(opcao => {
            if (opcao) { // Garante que não adicione opções vazias
                const option = document.createElement('option');
                option.value = opcao;
                option.textContent = opcao;
                selectElement.appendChild(option);
            }
        });
    };

    criarOpcoes(filtroMes, mesesUnicos, 'Todos os Meses');
    criarOpcoes(filtroDiretoria, diretoriasUnicas, 'Todas as Diretorias');
    criarOpcoes(filtroVeiculo, veiculosUnicos, 'Todos os Veículos');
    criarOpcoes(filtroMotorista, motoristasUnicos, 'Todos os Motoristas');
}


// Versão atualizada
function configurarEventListenerDesempenho() {
    const botaoFiltrar = document.getElementById('botao-filtrar-desempenho');
    if (botaoFiltrar) {
        botaoFiltrar.addEventListener('click', () => {
            // Agora chamamos a função de análise de verdade
            atualizarPainelDesempenho();
        });
    }
}

/**
 * Filtra os dados, calcula os KPIs, agrega os dados para os gráficos
 * e atualiza todos os elementos visuais da tela de desempenho.
 */
/**
 * Filtra os dados, calcula os KPIs, agrega os dados para os gráficos
 * e atualiza todos os elementos visuais da tela de desempenho.
 */
function atualizarPainelDesempenho() {
    // 1. Ler os valores selecionados nos filtros
    const mesSelecionado = document.getElementById('filtro-mes-desempenho').value;
    const diretoriaSelecionada = document.getElementById('filtro-diretoria-desempenho').value;
    const veiculoSelecionado = document.getElementById('filtro-veiculo-desempenho').value;
    const motoristaSelecionado = document.getElementById('filtro-motorista-desempenho').value;

    // 2. Filtrar os dados com base na seleção
    let dadosFiltrados = todosOsDadosDesempenho.filter(item => {
        // Ignora linhas sem data para segurança
        if (!item['Data/Hora']) return false;
        
        const mesDoItem = MESES_ORDENADOS[new Date(item['Data/Hora'].split(' ')[0].split('/').reverse().join('-')).getMonth()];

        const correspondeMes = (mesSelecionado === 'Todos') || (mesDoItem === mesSelecionado);
        const correspondeDiretoria = (diretoriaSelecionada === 'Todos') || (item.Diretoria === diretoriaSelecionada);
        const correspondeVeiculo = (veiculoSelecionado === 'Todos') || (item.Veiculo === veiculoSelecionado);
        const correspondeMotorista = (motoristaSelecionado === 'Todos') || (item.Motorista === motoristaSelecionado);

        return correspondeMes && correspondeDiretoria && correspondeVeiculo && correspondeMotorista;
    });

    // 3. Calcular os KPIs -- COM OS NOMES CORRETOS DA SUA PLANILHA
    const custoTotal = dadosFiltrados.reduce((soma, item) => soma + parseNumerico(item['Custo total de combustível']), 0);
    const totalLitros = dadosFiltrados.reduce((soma, item) => soma + parseNumerico(item['Total de litros']), 0);
    const totalKm = dadosFiltrados.reduce((soma, item) => soma + parseNumerico(item['Quilometragem']), 0);
    const custoKm = totalKm > 0 ? custoTotal / totalKm : 0;

    // 4. Atualizar os cards de KPI no HTML
    document.getElementById('desempenho-custo-total').textContent = formatarMoeda(custoTotal);
    document.getElementById('desempenho-total-litros').textContent = totalLitros.toFixed(2);
    document.getElementById('desempenho-total-km').textContent = `${totalKm.toFixed(0)} km`;
    document.getElementById('desempenho-custo-km').textContent = formatarMoeda(custoKm);

    // 5. Preparar dados para os gráficos -- COM OS NOMES CORRETOS
    // Gráfico de Gasto por Diretoria
    const gastoPorDiretoria = dadosFiltrados.reduce((acc, item) => {
        if (!acc[item.Diretoria]) {
            acc[item.Diretoria] = 0;
        }
        // USA O NOME CORRETO AQUI
        acc[item.Diretoria] += parseNumerico(item['Custo total de combustível']);
        return acc;
    }, {});
    
    // Gráfico Top 5 Veículos por Custo
    const gastoPorVeiculo = dadosFiltrados.reduce((acc, item) => {
        if (!acc[item.Veiculo]) {
            acc[item.Veiculo] = 0;
        }
        // E AQUI TAMBÉM
        acc[item.Veiculo] += parseNumerico(item['Custo total de combustível']);
        return acc;
    }, {});

    const top5Veiculos = Object.entries(gastoPorVeiculo)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

    // 6. Renderizar os gráficos
    renderizarGrafico('grafico-gasto-diretoria', 'pie', Object.keys(gastoPorDiretoria), Object.values(gastoPorDiretoria), 'Gasto por Diretoria');
    renderizarGrafico('grafico-top-veiculos', 'bar', top5Veiculos.map(item => item[0]), top5Veiculos.map(item => item[1]), 'Top 5 Veículos');
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

function configurarEventListeners() {
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
        dadosParaVisao = dadosParaVisao.filter(d => d.Mes.trim() === filtros.mes);
    }
    if (filtros.empresa !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Empresa.trim() === filtros.empresa);
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
        
        const dadosDaEmpresaNoAno = dadosAnoInteiro.filter(d => d.Empresa.trim() === filtros.empresa);
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
        tituloPainelDireita.textContent = 'Maiores 5 Custos na Seleção';
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
        if (!d || !d['Data/Hora']) { return false; }
        const dataString = String(d['Data/Hora']);
        const [dataPart] = dataString.split(' ');
        if (!dataPart || !dataPart.includes('/')) { return false; }
        const [dia, mes, ano] = dataPart.split('/');
        if(!dia || !mes || !ano) { return false; }
        const dataFormatada = `${ano}-${mes}-${dia}`;
        const dataAbastecimento = new Date(dataFormatada);
        if (isNaN(dataAbastecimento.getTime())) { return false; }
        const mesAbastecimento = MESES_ORDENADOS[dataAbastecimento.getMonth()];
        return mesAbastecimento === mesAtual;
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

        const nomeImagem = veiculo['ImagemURL'] || veiculo['Nome da Imagem'];
        card.innerHTML = `<div class="status-revisao ${statusMarcador}" title="${statusTexto}"></div>
                          <img src="${CAMINHO_IMAGENS}${nomeImagem}" 
                               onerror="this.src='${CAMINHO_IMAGENS}placeholder.png';" 
                               alt="${veiculo.Modelo}">
                          <div class="veiculo-info">
                              <h5>${veiculo.Modelo}</h5>
                              <p>${veiculo.Placa}</p>
                          </div>`;

        card.addEventListener('click', () => { 
            document.getElementById('detalhe-modelo').textContent = veiculo.Modelo;
            document.getElementById('detalhe-placa').textContent = veiculo.Placa;
            document.getElementById('detalhe-chassi').textContent = veiculo.Chassi;
            document.getElementById('detalhe-diretoria').textContent = veiculo.Diretoria; 
            document.getElementById('detalhe-renavam').textContent = veiculo.Renavam;
            document.getElementById('detalhe-cartao').textContent = veiculo.Cartão;
            document.getElementById('detalhe-revisao').textContent = statusTexto;
            document.getElementById('frota-detalhes').classList.add('visivel');
         });

        frotaGrid.appendChild(card);
    });

    document.getElementById('fechar-detalhes-frota').addEventListener('click', () => { 
        document.getElementById('frota-detalhes').classList.remove('visivel');
     });
}


// =======================================================
// --- FUNÇÃO AUXILIAR PARA RENDERIZAÇÃO DE GRÁFICOS ---
// =======================================================

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