// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================

// URLs das planilhas Google publicadas como CSV. Cada URL aponta para uma fonte de dados diferente.
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv';
const URL_PAINEL_VEICULOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgHtViC2nIILt8CvDtm_QQvcPmgWyNMhvfCxSFe7e6V26V6nV6El2k_t8bYcidgCsJjCnsV9C0IaPJ/pub?output=csv';
const URL_COMBUSTIVEL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1_Cwkcog1mJahMhTfLdrwtyWyTPE54CuR99bodFgnJCauwZ0DZ2-9poonfKTwfC5jG2Kci53OGhJV/pub?output=csv';

// --- Parâmetros da Lógica de Negócio ---

// Define o intervalo em KM para cada revisão periódica.
const REVISAO_INTERVALO_KM = 10000;
// Define quantos KM antes da próxima revisão um alerta deve ser gerado.
const REVISAO_ALERTA_KM = 2000;
// Array com os meses em ordem para facilitar a ordenação e filtros.
const MESES_ORDENADOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Variáveis globais para armazenar os dados carregados das planilhas.
// Isso evita ter que carregar os dados toda vez que um filtro é aplicado.
let todosOsDadosCustos = [];
let todosOsDadosVeiculos = [];
let todosOsDadosCombustivel = [];

// Paleta de cores padrão para os gráficos, garantindo consistência visual.
const PALETA_DE_CORES = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22', '#055bb1ff', '#f39c12', '#d35400', '#c0392b', '#8e44ad', '#2980b9', '#27ae60', '#d35400'];
// Objeto para mapear cada empresa a uma cor específica, usado nos gráficos.
const mapaDeCores = {};

// --- VARIÁVEIS PARA CONTROLAR A ROTAÇÃO DAS TELAS ---

// Armazena o temporizador da rotação automática de telas.
let temporizadorRotacao = null;
// Armazena o temporizador que detecta inatividade do usuário.
let temporizadorInatividade = null;
// Tempo em milissegundos que o sistema espera sem atividade do usuário para reiniciar a rotação.
const TEMPO_DE_INATIVIDADE = 20000; // 20 segundos


// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================

// Event listener que inicia a aplicação assim que o HTML da página é totalmente carregado.
document.addEventListener('DOMContentLoaded', iniciarDashboard);

/**
 * Função principal que inicializa o dashboard.
 * Carrega todos os dados das planilhas de forma assíncrona e paralela.
 * Após o carregamento, configura a primeira tela e inicia a rotação automática.
 */
async function iniciarDashboard() {
    // Promise.all carrega todas as fontes de dados simultaneamente para otimizar o tempo de carregamento.
    [todosOsDadosCustos, todosOsDadosVeiculos, todosOsDadosCombustivel] = await Promise.all([
        carregarDados(URL_CUSTOS_FIXOS),
        carregarDados(URL_PAINEL_VEICULOS),
        carregarDados(URL_COMBUSTIVEL)
    ]);

    // Se os dados de custos foram carregados com sucesso, configura a primeira tela.
    if (todosOsDadosCustos) {
        gerarMapaDeCores(todosOsDadosCustos); // Associa empresas a cores
        popularFiltros(todosOsDadosCustos); // Cria as opções dos menus de filtro
        configurarEventListeners(todosOsDadosCustos); // Configura o botão de "Aplicar Filtros"
    }
    
    // Inicia a rotação automática entre as telas do dashboard.
    iniciarRotacao(20000); // Troca de tela a cada 20 segundos
    // Configura o sensor de movimento do mouse para pausar a rotação quando o usuário está ativo.
    configurarSensorDeAtividade();
}


// =======================================================
// --- FUNÇÕES DE ROTAÇÃO DE TELA E DETECÇÃO DE ATIVIDADE ---
// =======================================================

/**
 * Gerencia a troca automática entre as diferentes telas do dashboard.
 * @param {number} intervalo - O tempo em milissegundos entre cada troca de tela.
 */
function iniciarRotacao(intervalo) {
    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return; // Não faz nada se houver apenas uma tela.
    let telaAtual = 0;
    
    // Função que é chamada para atualizar o conteúdo da tela que se torna ativa.
    const executarAtualizacoes = () => {
        const telaAtiva = telas[telaAtual];
        
        // Verifica o ID da tela ativa e chama a função de renderização correspondente.
        if (telaAtiva.id === 'dashboard-custos-fixos' && todosOsDadosCustos) {
            atualizarDashboard(todosOsDadosCustos, { mes: 'Todos', empresa: 'Todos' });
        } else if (telaAtiva.id === 'dashboard-frota' && todosOsDadosVeiculos && todosOsDadosCombustivel) {
            renderizarPainelFrota(todosOsDadosVeiculos, todosOsDadosCombustivel);
        }
    };

    // Executa a atualização da primeira tela antes de iniciar o intervalo.
    executarAtualizacoes();

    // Cria um intervalo que troca de tela e atualiza seu conteúdo periodicamente.
    temporizadorRotacao = setInterval(() => {
        telas[telaAtual].classList.remove('ativo'); // Esconde a tela atual
        telaAtual = (telaAtual + 1) % telas.length; // Calcula o índice da próxima tela
        telas[telaAtual].classList.add('ativo'); // Mostra a próxima tela
        executarAtualizacoes(); // Atualiza o conteúdo da nova tela ativa
    }, intervalo);
}

/**
 * Reinicia o timer de inatividade sempre que o usuário interage (move o mouse).
 * Isso pausa a rotação automática para permitir que o usuário analise uma tela específica.
 */
function reiniciarTimerDeInatividade() {
    clearInterval(temporizadorRotacao); // Para a rotação automática
    clearTimeout(temporizadorInatividade); // Cancela o timer de inatividade anterior
    // Inicia um novo timer: se o usuário ficar inativo pelo tempo definido, a rotação reinicia.
    temporizadorInatividade = setTimeout(() => {
        iniciarRotacao(20000); 
    }, TEMPO_DE_INATIVIDADE);
}

/**
 * Adiciona um event listener global que detecta movimento do mouse para chamar a função de reinício do timer.
 */
function configurarSensorDeAtividade() {
    window.addEventListener('mousemove', reiniciarTimerDeInatividade);
}


// =======================================================
// --- FUNÇÕES DE LÓGICA E UTILITÁRIOS --- 
// =======================================================

/**
 * Carrega e processa um arquivo CSV de uma URL usando a biblioteca PapaParse.
 * @param {string} url - A URL do arquivo CSV.
 * @returns {Promise<Array|null>} Uma promessa que resolve para um array de objetos (os dados) ou null em caso de erro.
 */
async function carregarDados(url) {
    if (!url || url.includes('URL_')) { return null; } // Validação básica da URL
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) { throw new Error(`Falha na rede: ${resposta.statusText}`); }
        const textoCsv = await resposta.text();
        // PapaParse converte o texto CSV em um array de objetos JavaScript.
        // `header: true` usa a primeira linha do CSV como chaves dos objetos.
        const { data } = Papa.parse(textoCsv, { header: true, skipEmptyLines: true });
        return data;
    } catch (erro) {
        console.error(`Erro ao carregar dados da URL: ${url}`, erro);
        return null;
    }
}

/**
 * Converte um valor (string ou número) para um formato numérico (float).
 * Lida com formatos brasileiros (com vírgula como decimal) e americanos.
 * Retorna 0 se o valor for inválido ou vazio.
 * @param {*} valor - O valor a ser convertido.
 * @returns {number} O valor convertido para número.
 */
function parseNumerico(valor) {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string' || !valor.trim()) return 0;
    const valorStr = String(valor).trim();
    // Se a string contém vírgula, assume que é um número no formato brasileiro.
    if (valorStr.includes(',')) {
        // Remove pontos de milhar e substitui a vírgula decimal por ponto.
        return parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
    }
    return parseFloat(valorStr);
}

/**
 * Formata um número para o padrão de moeda brasileiro (Real).
 * @param {number} valor - O número a ser formatado.
 * @returns {string} A string formatada como moeda (ex: "R$ 1.234,56").
 */
function formatarMoeda(valor) {
    if (typeof valor !== 'number' || isNaN(valor)) return "R$ 0,00";
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- Funções da Tela de Custos Fixos ---

/**
 * Cria um mapa de cores, associando cada empresa única a uma cor da paleta.
 * Isso garante que a mesma empresa tenha sempre a mesma cor nos gráficos.
 * @param {Array} dados - O array de dados de custos.
 */
function gerarMapaDeCores(dados) {
    // Cria uma lista de empresas únicas e a ordena.
    const empresasUnicas = [...new Set(dados.filter(item => item.Empresa).map(item => item.Empresa.trim()))].sort();
    // Itera sobre as empresas e atribui uma cor a cada uma.
    empresasUnicas.forEach((empresa, index) => {
        mapaDeCores[empresa] = PALETA_DE_CORES[index % PALETA_DE_CORES.length];
    });
}

/**
 * Preenche os menus <select> de filtro (Mês e Empresa) com opções baseadas nos dados disponíveis.
 * @param {Array} dados - O array de dados de custos.
 */
function popularFiltros(dados) {
    const filtroMes = document.getElementById('filtro-mes');
    const filtroEmpresa = document.getElementById('filtro-empresa');
    if(!filtroMes || !filtroEmpresa) return;

    // Filtra os dados para considerar apenas o ano atual.
    const anoAtual = new Date().getFullYear();
    const dadosAnoAtual = dados.filter(d => Number(d.Ano) === anoAtual);
    // Pega os meses e empresas únicos dos dados do ano atual para criar as opções.
    const mesesUnicos = [...new Set(dadosAnoAtual.filter(item => item.Mes).map(item => item.Mes.trim()))].sort((a, b) => MESES_ORDENADOS.indexOf(a) - MESES_ORDENADOS.indexOf(b));
    const empresasUnicas = [...new Set(dadosAnoAtual.filter(item => item.Empresa).map(item => item.Empresa.trim()))].sort();

    // Adiciona as opções de filtro nos elementos <select> do HTML.
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

/**
 * Configura o event listener para o botão "Aplicar Filtros".
 * @param {Array} dados - O array completo de dados de custos.
 */
function configurarEventListeners(dados) {
    const botaoFiltrar = document.getElementById('botao-filtrar');
    if(!botaoFiltrar) return;
    // Quando o botão é clicado, pega os valores selecionados nos filtros e atualiza o dashboard.
    botaoFiltrar.addEventListener('click', () => {
        const mesSelecionado = document.getElementById('filtro-mes').value;
        const empresaSelecionada = document.getElementById('filtro-empresa').value;
        const filtros = { mes: mesSelecionado, empresa: empresaSelecionada };
        atualizarDashboard(todosOsDadosCustos, filtros);
    });
}

/**
 * Função central que recalcula e atualiza todos os elementos da tela de Custos Fixos.
 * É chamada tanto na inicialização quanto ao aplicar filtros.
 * @param {Array} dados - O array completo de dados de custos.
 * @param {object} filtros - Um objeto com os filtros selecionados (ex: { mes: 'Janeiro', empresa: 'Todos' }).
 */
function atualizarDashboard(dados, filtros) {
    const anoAtual = new Date().getFullYear();
    // Filtra dados para pegar tudo do ano corrente, usado para cálculos anuais.
    const dadosAnoInteiro = dados.filter(d => parseNumerico(d.Ano) === anoAtual);
    
    // Aplica os filtros selecionados pelo usuário (mês e/ou empresa).
    let dadosParaVisao = [...dadosAnoInteiro];
    if (filtros.mes !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Mes && d.Mes.trim() === filtros.mes);
    }
    if (filtros.empresa !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
    }
    
    // --- Cálculos para os Cards de Resumo ---
    const custoAnualTotal = dadosAnoInteiro.reduce((soma, item) => soma + parseNumerico(item.ValorGasto), 0);
    const mesesPassados = new Date().getMonth() + 1;
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;
    const custoSelecaoAtual = dadosParaVisao.reduce((soma, item) => soma + parseNumerico(item.ValorGasto), 0);
    
    // --- Atualização dos Elementos HTML (Cards) ---
    document.querySelector('#custo-anual-total-card h3').textContent = `Custo Anual Total (${anoAtual})`;
    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.querySelector('#custo-mes-atual-card h3').textContent = `Custo da Seleção`;
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoSelecaoAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);
    
    // --- Lógica de Renderização Condicional dos Gráficos ---
    const tituloGraficoEsquerda = document.querySelector('#titulo-grafico-esquerda');
    const tituloPainelDireita = document.getElementById('titulo-wrapper-direita');
    const containerDireita = document.getElementById('container-direita');

    // Se uma empresa específica foi selecionada...
    if (filtros.empresa !== 'Todos') {
        // O gráfico da esquerda mostrará a evolução mensal de custos daquela empresa.
        tituloGraficoEsquerda.textContent = `Evolução Mensal - ${filtros.empresa}`;
        // O painel da direita mostrará indicadores (KPIs) específicos daquela empresa.
        tituloPainelDireita.textContent = `Indicadores Chave - ${filtros.empresa}`;
        
        // Prepara os dados para o gráfico de linha da evolução mensal.
        const dadosDaEmpresaNoAno = dadosAnoInteiro.filter(d => d.Empresa && d.Empresa.trim() === filtros.empresa);
        const gastosMensais = Array(12).fill(0); // Cria um array com 12 posições (meses)
        dadosDaEmpresaNoAno.forEach(item => {
            const indiceMes = MESES_ORDENADOS.indexOf(item.Mes.trim());
            if (indiceMes !== -1) {
                gastosMensais[indiceMes] = parseNumerico(item.ValorGasto);
            }
        });
        renderizarGrafico('graficoAnualEmpresas', 'line', MESES_ORDENADOS, gastosMensais, `Custo Mensal de ${filtros.empresa}`);
        
        // Calcula e exibe os KPIs no painel da direita.
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
    } else { // Se "Todas as Empresas" estiver selecionado...
        // O gráfico da esquerda mostrará a distribuição de gastos por empresa (gráfico de pizza).
        tituloGraficoEsquerda.textContent = 'Gasto por Empresa (%) na Seleção';
        // O painel da direita mostrará um gráfico de barras com os 5 maiores custos.
        tituloPainelDireita.textContent = 'Maiores 5 Custos na Seleção';
        containerDireita.innerHTML = '<canvas id="graficoEvolucaoMensal"></canvas>'; // Garante que o canvas exista
        
        // Agrupa os gastos por empresa para o gráfico de pizza.
        const gastosPorEmpresa = dadosParaVisao.reduce((acc, item) => {
            if (!acc[item.Empresa]) { acc[item.Empresa] = 0; }
            acc[item.Empresa] += parseNumerico(item.ValorGasto);
            return acc;
        }, {});
        const labelsEmpresas = Object.keys(gastosPorEmpresa);
        const dataEmpresas = Object.values(gastosPorEmpresa);
        renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto na Seleção por Empresa');
        
        // Pega os 5 maiores gastos para o gráfico de barras.
        const top5Gastos = Object.entries(gastosPorEmpresa).sort(([, a], [, b]) => b - a).slice(0, 5);
        const labelsTop5 = top5Gastos.map(item => item[0]);
        const dataTop5 = top5Gastos.map(item => item[1]);
        renderizarGrafico('graficoEvolucaoMensal', 'bar', labelsTop5, dataTop5, 'Maiores Custos na Seleção');
    }
}

// --- Funções da Tela de Frota ---

/**
 * Renderiza todo o conteúdo da tela de Controle de Frota.
 * @param {Array} dadosVeiculos - Os dados cadastrais dos veículos.
 * @param {Array} dadosCombustivel - O histórico de abastecimentos.
 */
function renderizarPainelFrota(dadosVeiculos, dadosCombustivel) {
    const frotaGrid = document.getElementById('frota-grid');
    if (!frotaGrid) return;
    frotaGrid.innerHTML = ''; // Limpa o grid antes de adicionar os novos cards
    const mesAtual = MESES_ORDENADOS[new Date().getMonth()];

    // Filtra os dados de combustível para pegar apenas os registros do mês atual.
    const dadosCombustivelMes = dadosCombustivel.filter(d => {
        if (!d['Data/Hora']) return false;
        
        // Lógica segura para processar a data no formato DD/MM/AAAA
        const dataString = String(d['Data/Hora']);
        const [dataPart] = dataString.split(' ');
        const [dia, mes, ano] = dataPart.split('/');
        const dataFormatada = `${ano}-${mes}-${dia}`;
        const dataAbastecimento = new Date(dataFormatada);
        const mesAbastecimento = MESES_ORDENADOS[dataAbastecimento.getMonth()];
        
        return mesAbastecimento === mesAtual;
    });

    // Calcula os totais do mês para os cards de resumo.
    const totalLitrosFrota = dadosCombustivelMes.reduce((soma, item) => soma + parseNumerico(item['Total de litros']), 0);
    const custoTotalFrota = dadosCombustivelMes.reduce((soma, item) => soma + parseNumerico(item['Custo total de combustível']), 0);
    const totalKmFrota = dadosCombustivelMes.reduce((soma, item) => soma + parseNumerico(item.Quilometragem), 0);

    // Atualiza os valores nos cards de resumo da frota.
    document.getElementById('frota-total-litros').textContent = totalLitrosFrota.toFixed(2);
    document.getElementById('frota-custo-total').textContent = formatarMoeda(custoTotalFrota);
    document.getElementById('frota-custo-litro').textContent = totalLitrosFrota > 0 ? formatarMoeda(custoTotalFrota / totalLitrosFrota) : formatarMoeda(0);
    document.getElementById('frota-total-km').textContent = totalKmFrota.toFixed(2);

    // Itera sobre cada veículo para criar um card para ele.
    dadosVeiculos.forEach(veiculo => {
        // Lógica para determinar o status da revisão.
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
        
        // Cria o elemento HTML do card do veículo.
        const card = document.createElement('div');
        card.className = `veiculo-card ${statusClasse}`;
        card.innerHTML = `<div class="status-revisao ${statusMarcador}" title="${statusTexto}"></div><img src="https://via.placeholder.com/300x200.png?text=${veiculo.Modelo}" alt="${veiculo.Modelo}"><div class="veiculo-info"><h5>${veiculo.Modelo}</h5><p>${veiculo.Placa}</p></div>`;

        // Adiciona um evento de clique ao card para mostrar a janela de detalhes.
        card.addEventListener('click', () => { 
            document.getElementById('detalhe-modelo').textContent = veiculo.Modelo;
            document.getElementById('detalhe-placa').textContent = veiculo.Placa;
            document.getElementById('detalhe-chassi').textContent = veiculo.Chassi;
            document.getElementById('detalhe-diretoria').textContent = veiculo.Diretoria; 
            document.getElementById('detalhe-renavam').textContent = veiculo.Renavam;
            document.getElementById('detalhe-revisao').textContent = statusTexto;
            document.getElementById('frota-detalhes').classList.add('visivel');
         });

        frotaGrid.appendChild(card);
    });

    // Configura o botão para fechar a janela de detalhes.
    document.getElementById('fechar-detalhes-frota').addEventListener('click', () => { 
        document.getElementById('frota-detalhes').classList.remove('visivel');
     });
}

// =======================================================
// --- FUNÇÃO AUXILIAR PARA RENDERIZAÇÃO DE GRÁFICOS ---
// =======================================================

/**
 * Renderiza ou atualiza um gráfico na tela usando a biblioteca Chart.js.
 * @param {string} canvasId - O ID do elemento <canvas> onde o gráfico será desenhado.
 * @param {string} tipo - O tipo do gráfico (ex: 'pie', 'bar', 'line').
 * @param {Array} labels - Os rótulos para o eixo X ou para as fatias da pizza.
 * @param {Array} data - Os dados numéricos para o gráfico.
 * @param {string} labelDataset - O rótulo para o conjunto de dados (usado em legendas e tooltips).
 */
function renderizarGrafico(canvasId, tipo, labels, data, labelDataset) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');
    
    // Se já existe um gráfico no canvas, ele é destruído para evitar sobreposição e bugs.
    if (canvas.chart) { canvas.chart.destroy(); }
    
    const corTextoEixos = '#bdc3c7';
    // Usa o mapa de cores para colorir os gráficos de pizza e barras.
    const backgroundColors = labels.map(label => mapaDeCores[label] || '#cccccc');
    
    // Opções de configuração do Chart.js para customizar a aparência e o comportamento dos gráficos.
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                display: tipo === 'pie', // Mostra legenda apenas para gráficos de pizza
                position: 'right', 
                labels: { color: corTextoEixos } 
            },
            tooltip: {
                // Formata os tooltips (caixas de informação que aparecem ao passar o mouse)
                callbacks: {
                    label: function(context) {
                        const valor = context.parsed.y || context.parsed;
                        // Para gráficos de pizza, mostra valor, percentual e nome.
                        if (context.chart.config.type === 'pie') {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const porcentagem = total > 0 ? ((valor / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${formatarMoeda(valor)} (${porcentagem}%)`;
                        }
                        // Para outros gráficos, mostra o valor formatado como moeda.
                        return `${context.dataset.label}: ${formatarMoeda(valor)}`;
                    }
                }
            }
        },
        // Mostra ou esconde os eixos X e Y dependendo do tipo de gráfico.
        scales: (tipo === 'bar' || tipo === 'line') ? {
            x: { ticks: { color: corTextoEixos }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
            y: { ticks: { color: corTextoEixos, callback: (value) => formatarMoeda(value) }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
        } : {}
    };

    // Cria a nova instância do gráfico.
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
                fill: tipo === 'line' // Preenche a área sob a linha no gráfico de linha
            }]
        },
        options: chartOptions
    });
}