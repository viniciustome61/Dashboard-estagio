// =======================================================
// --- CONFIGURAÇÃO INICIAL E VARIÁVEIS GLOBAIS ---
// =======================================================

// URLs para as planilhas do Google Sheets que servem como fonte de dados.
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIgjLhuc6IKTWESz4HqSVuS69u6R8qgWDJbP7AwV8lJktHM1VYH6OqurGHZtYrVFZWrX28oBEBMSfk/pub?gid=609548241&single=true&output=csv';
const URL_PAINEL_VEICULOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIgjLhuc6IKTWESz4HqSVuS69u6R8qgWDJbP7AwV8lJktHM1VYH6OqurGHZtYrVFZWrX28oBEBMSfk/pub?gid=1497148731&single=true&output=csv';
const URL_DESEMPENHO_FROTA = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIgjLhuc6IKTWESz4HqSVuS69u6R8qgWDJbP7AwV8lJktHM1VYH6OqurGHZtYrVFZWrX28oBEBMSfk/pub?gid=1074663302&single=true&output=csv';
const URL_CONTRATOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTIgjLhuc6IKTWESz4HqSVuS69u6R8qgWDJbP7AwV8lJktHM1VYH6OqurGHZtYrVFZWrX28oBEBMSfk/pub?gid=1219538623&single=true&output=csv';

// Arrays que armazenarão os dados carregados das planilhas.
let todosOsDadosContratos = [];
let todosOsDadosDesempenho = [];
let todosOsDadosCustos = [];
let todosOsDadosVeiculos = [];

// Constantes de configuração para a lógica da aplicação.
const CAMINHO_IMAGENS = 'Imagens veiculos/';
const CAMINHO_IMAGENS_EMPRESAS = 'Imagens Empresas/';
const REVISAO_INTERVALO_KM = 10000;
const REVISAO_ALERTA_KM = 2000;
const MESES_ORDENADOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Paleta de cores padrão para os gráficos.
const PALETA_DE_CORES = ['#55efc4', '#81ecec', '#74b9ff', '#a29bfe', '#dfe6e9', '#00cec9', '#0984e3', '#6c5ce7', '#ffeaa7', '#fab1a0', '#ff7675', '#fd79a8', '#fdcb6e', '#e17055', '#d63031', '#e84393'];
let mapaDeCores = {};

// O contador de cores agora é global, para não ser reiniciado a cada chamada da função.
let proximaCorIndex = 0;

// Mapeamento manual para garantir cores consistentes para categorias importantes.
const MAPEAMENTO_CORES_MANUAL = {
    "PR": "#3498db", "DIG": "#e74c3c", "DGM": "#9b59b6", "DAF": "#f1c40f", "SERAFI": "#2ecc71", "DHT/DIHIBA": "#e24678ff"
};

// Variáveis para controlar a rotação automática de telas e a inatividade do usuário.
let temporizadorRotacao = null;
let temporizadorInatividade = null;
const TEMPO_DE_INATIVIDADE = 10000;

// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================

/**
 * Função principal que é executada quando o DOM está totalmente carregado.
 * Responsável por orquestrar o carregamento de todos os dados e a inicialização dos painéis.
 */
document.addEventListener('DOMContentLoaded', iniciarDashboard);

async function iniciarDashboard() {
    try {
        const [dadosCarregadosCustos, dadosVeiculos, dadosDesempenho, dadosContratos] = await Promise.all([
            carregarDados(URL_CUSTOS_FIXOS, 'custos'),
            carregarDados(URL_PAINEL_VEICULOS, 'veiculos'),
            carregarDados(URL_DESEMPENHO_FROTA, 'desempenho'),
            carregarDados(URL_CONTRATOS, 'contratos')
        ]);
        
        todosOsDadosCustos = transformarDadosCustos(dadosCarregadosCustos);
        todosOsDadosVeiculos = dadosVeiculos;
        todosOsDadosDesempenho = dadosDesempenho;
        todosOsDadosContratos = dadosContratos;

        if (todosOsDadosDesempenho) {
            todosOsDadosDesempenho = limparDadosDesempenho(todosOsDadosDesempenho);
            const diretoriasUnicas = [...new Set(todosOsDadosDesempenho.map(item => item.Diretoria).filter(d => d))].sort();
            gerarMapaDeCores(diretoriasUnicas);
            popularFiltrosDesempenho(todosOsDadosDesempenho);
            configurarEventListenerDesempenho();
        }

        if (todosOsDadosCustos) {
            const empresasUnicas = [...new Set(todosOsDadosCustos.map(item => item.Empresa).filter(e => e))].sort();
            gerarMapaDeCores(empresasUnicas);
            popularFiltros(todosOsDadosCustos);
            configurarEventListeners();
        }
        
        iniciarRotacao(10000); // 10 segundos
        configurarSensorDeAtividade();
    } catch (erro) {
        console.error("Erro fatal ao iniciar o dashboard:", erro);
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `<div class="mensagem-erro">
                <h1>Erro ao carregar os dados</h1>
                <p>Não foi possível carregar os dados das planilhas. Verifique o console (F12) para mais detalhes.</p>
            </div>`;
        }
    }
}

/**
 * Transforma os dados de custo do formato "largo" para o formato "longo".
 * @param {Array<Object>} dadosLargos - Os dados brutos da nova planilha.
 * @returns {Array<Object>} - Os dados transformados.
 */
function transformarDadosCustos(dadosLargos) {
    const dadosTransformados = [];
    const anoAtual = new Date().getFullYear(); 

    const mapaMeses = {
        "JAN": "Janeiro", "FEV": "Fevereiro", "MAR": "Março", "ABR": "Abril", 
        "MAI": "Maio", "JUN": "Junho", "JUL": "Julho", "AGO": "Agosto", 
        "SET": "Setembro", "OUT": "Outubro", "NOV": "Novembro", "DEZ": "Dezembro"
    };

    dadosLargos.forEach(linha => {
        const nomeEmpresa = linha.EMPRESA;
        if (!nomeEmpresa) return;

        for (const chaveMes in mapaMeses) {
            if (linha.hasOwnProperty(chaveMes)) {
                const valorGasto = parseNumerico(linha[chaveMes]);
                
                dadosTransformados.push({
                    Empresa: nomeEmpresa.trim(),
                    Mes: mapaMeses[chaveMes],
                    Ano: anoAtual,
                    ValorGasto: valorGasto
                });
            }
        }
    });

    return dadosTransformados;
}


// =======================================================
// --- FUNÇÕES DE ROTAÇÃO DE TELA E DETECÇÃO DE ATIVIDADE ---
// =======================================================

/**
 * Inicia a transição automática entre as diferentes telas do dashboard.
 * @param {number} intervalo - O tempo em milissegundos para alternar entre as telas.
 */
function iniciarRotacao(intervalo) {
    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return;
    let telaAtual = 0;
    
    const executarAtualizacoes = () => {
        const telaAtiva = telas[telaAtual];
        
        if (telaAtiva.id === 'dashboard-custos-fixos' && todosOsDadosCustos) {
            atualizarDashboard(todosOsDadosCustos, { mes: 'Todos', empresa: 'Todos' });
        } else if (telaAtiva.id === 'dashboard-frota' && todosOsDadosVeiculos) {
            renderizarPainelFrota(todosOsDadosVeiculos);
        } else if (telaAtiva.id === 'dashboard-desempenho-frota' && todosOsDadosDesempenho) {
            atualizarPainelDesempenho();
        } else if (telaAtiva.id === 'dashboard-contratos' && todosOsDadosContratos) {
            renderizarPainelContratos(todosOsDadosContratos);
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

/**
 * Pausa a rotação automática de telas quando detecta atividade do usuário.
 */
function reiniciarTimerDeInatividade() {
    clearInterval(temporizadorRotacao);
    clearTimeout(temporizadorInatividade);
    temporizadorInatividade = setTimeout(() => {
        iniciarRotacao(20000); 
    }, TEMPO_DE_INATIVIDADE);
}

/**
 * Adiciona um event listener para detectar movimentos do mouse e reiniciar o timer de inatividade.
 */
function configurarSensorDeAtividade() {
    window.addEventListener('mousemove', reiniciarTimerDeInatividade);
}

// =======================================================
// --- FUNÇÕES DE LÓGICA E UTILITÁRIOS --- 
// =======================================================

/**
 * Carrega dados de uma URL (planilha CSV) e os converte para JSON.
 */
async function carregarDados(url, nomeDados) {
    if (!url || !url.startsWith('https')) {
        throw new Error(`URL inválida ou ausente para ${nomeDados}`);
    }
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) {
            throw new Error(`Falha na rede ao buscar ${nomeDados} (Status: ${resposta.status})`);
        }
        const textoCsv = await resposta.text();
        const { data } = Papa.parse(textoCsv, { header: true, skipEmptyLines: true });
        return data;
    } catch (erro) {
        console.error(`Erro crítico ao carregar ou processar dados de ${nomeDados}:`, erro);
        throw erro;
    }
}

/**
 * Converte uma string (potencialmente formatada como moeda) em um número.
 */
function parseNumerico(valor) {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string' || !valor.trim()) return 0;
    const valorStr = String(valor).trim().replace('R$', '').replace('$', '').trim();
    let valorFinal;
    if (valorStr.includes(',')) {
        valorFinal = valorStr.replace(/\./g, '').replace(',', '.');
    } else {
        valorFinal = valorStr;
    }
    const resultado = parseFloat(valorFinal);
    return isNaN(resultado) ? 0 : resultado;
}

/**
 * Formata um número para o padrão de moeda brasileiro (BRL).
 */
function formatarMoeda(valor) {
    if (typeof valor !== 'number' || isNaN(valor)) return "R$ 0,00";
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Associa uma cor a cada item de uma lista de forma sequencial e sem repetição.
 */
function gerarMapaDeCores(listaDeItens) {
    listaDeItens.forEach(item => {
        if (!mapaDeCores[item]) {
            if (MAPEAMENTO_CORES_MANUAL[item]) {
                mapaDeCores[item] = MAPEAMENTO_CORES_MANUAL[item];
            } else {
                mapaDeCores[item] = PALETA_DE_CORES[proximaCorIndex % PALETA_DE_CORES.length];
                proximaCorIndex++;
            }
        }
    });
}

// --- Funções da Nova Tela de Desempenho ---

/**
 * Limpa os dados de desempenho, removendo espaços extras dos nomes das colunas.
 */
function limparDadosDesempenho(dados) {
    return dados.map(item => {
        const itemLimpo = {};
        for (const chave in item) {
            const chaveLimpa = chave.trim();
            itemLimpo[chaveLimpa] = item[chave];
        }
        return itemLimpo;
    });
}

/**
 * Preenche os menus de filtro na tela de Desempenho da Frota.
 */
function popularFiltrosDesempenho(dados) {
    const filtroMes = document.getElementById('filtro-mes-desempenho');
    const filtroDiretoria = document.getElementById('filtro-diretoria-desempenho');
    const filtroVeiculo = document.getElementById('filtro-veiculo-desempenho');
    const filtroMotorista = document.getElementById('filtro-motorista-desempenho');
    const filtroCombustivel = document.getElementById('filtro-combustivel-desempenho');

    const dadosComData = dados.filter(item => item['Data/Hora'] && item['Data/Hora'].trim() !== '');

    const mesesUnicos = [...new Set(dadosComData.map(item => MESES_ORDENADOS[new Date(item['Data/Hora'].split(' ')[0].split('/').reverse().join('-')).getMonth()]))].sort((a, b) => MESES_ORDENADOS.indexOf(a) - MESES_ORDENADOS.indexOf(b));
    const diretoriasUnicas = [...new Set(dadosComData.map(item => item.Diretoria))].sort();
    const veiculosUnicos = [...new Set(dadosComData.map(item => item['Veículo']))].sort();
    const motoristasUnicos = [...new Set(dadosComData.map(item => item.Motorista))].sort();
    const combustiveisUnicos = [...new Set(dadosComData.map(item => item['Tipo Combustível']))].sort();

    const criarOpcoes = (selectElement, opcoes, valorPadrao = 'Todos') => {
        selectElement.innerHTML = `<option value="Todos">${valorPadrao}</option>`;
        opcoes.forEach(opcao => {
            if (opcao) {
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
    criarOpcoes(filtroCombustivel, combustiveisUnicos, 'Todos os Tipos');
}

/**
 * Adiciona o event listener ao botão de filtro da tela de Desempenho.
 */
function configurarEventListenerDesempenho() {
    const botaoFiltrar = document.getElementById('botao-filtrar-desempenho');
    if (botaoFiltrar) {
        botaoFiltrar.addEventListener('click', () => {
            atualizarPainelDesempenho();
        });
    }
}

/**
 * Atualiza os KPIs e gráficos da tela de Desempenho com base nos filtros selecionados.
 */
function atualizarPainelDesempenho() {
    const mesSelecionado = document.getElementById('filtro-mes-desempenho').value;
    const diretoriaSelecionada = document.getElementById('filtro-diretoria-desempenho').value;
    const veiculoSelecionado = document.getElementById('filtro-veiculo-desempenho').value;
    const motoristaSelecionado = document.getElementById('filtro-motorista-desempenho').value;
    const combustivelSelecionado = document.getElementById('filtro-combustivel-desempenho').value;

    let dadosFiltrados = todosOsDadosDesempenho.filter(item => {
        if (!item['Data/Hora']) return false;
        const mesDoItem = MESES_ORDENADOS[new Date(item['Data/Hora'].split(' ')[0].split('/').reverse().join('-')).getMonth()];
        const correspondeMes = (mesSelecionado === 'Todos') || (mesDoItem === mesSelecionado);
        const correspondeDiretoria = (diretoriaSelecionada === 'Todos') || (item.Diretoria === diretoriaSelecionada);
        const correspondeVeiculo = (veiculoSelecionado === 'Todos') || (item['Veículo'] === veiculoSelecionado);
        const correspondeMotorista = (motoristaSelecionado === 'Todos') || (item.Motorista === motoristaSelecionado);
        const correspondeCombustivel = (combustivelSelecionado === 'Todos') || (item['Tipo Combustível'] === combustivelSelecionado);
        return correspondeMes && correspondeDiretoria && correspondeVeiculo && correspondeMotorista && correspondeCombustivel;
    });

    const custoTotal = dadosFiltrados.reduce((soma, item) => soma + parseNumerico(item['Custo total de combustível']), 0);
    const totalKm = dadosFiltrados.reduce((soma, item) => soma + parseNumerico(item['Quilometragem']), 0);
    const totalLitros = dadosFiltrados.reduce((soma, item) => soma + parseNumerico(item['Total de litros']), 0);
    const custoMedioLitro = totalLitros > 0 ? custoTotal / totalLitros : 0;
    const eficienciaMedia = totalLitros > 0 ? totalKm / totalLitros : 0;

    document.getElementById('desempenho-custo-total').textContent = formatarMoeda(custoTotal);
    document.getElementById('desempenho-total-km').textContent = `${totalKm.toFixed(0)} km`;
    document.getElementById('desempenho-custo-litro').textContent = formatarMoeda(custoMedioLitro);
    document.getElementById('desempenho-eficiencia-media').textContent = `${eficienciaMedia.toFixed(1)} Km/L`;

    const tituloEsquerda = document.getElementById('titulo-desempenho-esquerda');
    const tituloDireita = document.getElementById('titulo-desempenho-direita');
    const containerDireita = document.getElementById('container-desempenho-direita');

    if (veiculoSelecionado !== 'Todos') {
        tituloEsquerda.textContent = `Evolução Mensal de Custos - ${veiculoSelecionado}`;
        tituloDireita.textContent = `Médias Gerais - ${veiculoSelecionado}`;
        
        const dadosDoVeiculoNoAno = todosOsDadosDesempenho.filter(item => item['Veículo'] === veiculoSelecionado);
        const gastosMensais = Array(12).fill(0);
        dadosDoVeiculoNoAno.forEach(item => {
            if(item['Data/Hora']) {
                const indiceMes = MESES_ORDENADOS.indexOf(MESES_ORDENADOS[new Date(item['Data/Hora'].split(' ')[0].split('/').reverse().join('-')).getMonth()]);
                if (indiceMes !== -1) {
                    gastosMensais[indiceMes] += parseNumerico(item['Custo total de combustível']);
                }
            }
        });
        const pointColors = Array(12).fill('#3498db');
        if (mesSelecionado !== 'Todos') {
            const indiceMesSelecionado = MESES_ORDENADOS.indexOf(mesSelecionado);
            if (indiceMesSelecionado !== -1) {
                pointColors[indiceMesSelecionado] = '#e74c3c';
            }
        }
        renderizarGrafico('grafico-desempenho-esquerda', 'line', MESES_ORDENADOS, gastosMensais, 'Custo Mensal', pointColors);

        const numeroAbastecimentos = dadosFiltrados.length;
        const custoMedioAbastecimento = numeroAbastecimentos > 0 ? custoTotal / numeroAbastecimentos : 0;
        const litrosMedioAbastecimento = numeroAbastecimentos > 0 ? totalLitros / numeroAbastecimentos : 0;
        
        containerDireita.innerHTML = `
            <div class="kpi-container-vertical">
                <div class="kpi-card"><h5>Eficiência Média (Km/L)</h5><p>${eficienciaMedia.toFixed(1)}</p></div>
                <div class="kpi-card"><h5>Custo Médio / Abastecimento</h5><p>${formatarMoeda(custoMedioAbastecimento)}</p></div>
                <div class="kpi-card"><h5>Litros / Abastecimento</h5><p>${litrosMedioAbastecimento.toFixed(1)}</p></div>
            </div>`;
    } else if (diretoriaSelecionada !== 'Todos') {
        tituloEsquerda.textContent = `Gasto por Veículo - ${diretoriaSelecionada}`;
        tituloDireita.textContent = `Custo por Litro - ${diretoriaSelecionada}`;
        containerDireita.innerHTML = '<canvas id="grafico-desempenho-direita"></canvas>';

        const gastoPorVeiculo = dadosFiltrados.reduce((acc, item) => {
            if (item['Veículo']) {
                if (!acc[item['Veículo']]) acc[item['Veículo']] = 0;
                acc[item['Veículo']] += parseNumerico(item['Custo total de combustível']);
            }
            return acc;
        }, {});
        renderizarGrafico('grafico-desempenho-esquerda', 'bar', Object.keys(gastoPorVeiculo), Object.values(gastoPorVeiculo), 'Gasto por Veículo');

        const dadosAgregados = dadosFiltrados.reduce((acc, item) => {
            if (item['Veículo']) {
                if (!acc[item['Veículo']]) acc[item['Veículo']] = { custoTotal: 0, litrosTotal: 0 };
                acc[item['Veículo']].custoTotal += parseNumerico(item['Custo total de combustível']);
                acc[item['Veículo']].litrosTotal += parseNumerico(item['Total de litros']);
            }
            return acc;
        }, {});
        const custoLitroPorVeiculo = Object.entries(dadosAgregados).map(([veiculo, dados]) => ({
            veiculo,
            custoLitro: dados.litrosTotal > 0 ? dados.custoTotal / dados.litrosTotal : 0
        })).sort((a, b) => b.custoLitro - a.custoLitro);
        renderizarGrafico('grafico-desempenho-direita', 'bar', custoLitroPorVeiculo.map(d => d.veiculo), custoLitroPorVeiculo.map(d => d.custoLitro), 'Custo por Litro');
    } else {
        tituloEsquerda.textContent = 'Gasto por Diretoria';
        tituloDireita.textContent = 'Custo por Litro por Veículo';
        containerDireita.innerHTML = '<canvas id="grafico-desempenho-direita"></canvas>';

        const gastoPorDiretoria = dadosFiltrados.reduce((acc, item) => {
            if (item.Diretoria) {
                if (!acc[item.Diretoria]) acc[item.Diretoria] = 0;
                acc[item.Diretoria] += parseNumerico(item['Custo total de combustível']);
            }
            return acc;
        }, {});
        renderizarGrafico('grafico-desempenho-esquerda', 'pie', Object.keys(gastoPorDiretoria), Object.values(gastoPorDiretoria), 'Gasto por Diretoria');
        
        const dadosAgregados = dadosFiltrados.reduce((acc, item) => {
            if (item['Veículo']) {
                if (!acc[item['Veículo']]) acc[item['Veículo']] = { custoTotal: 0, litrosTotal: 0 };
                acc[item['Veículo']].custoTotal += parseNumerico(item['Custo total de combustível']);
                acc[item['Veículo']].litrosTotal += parseNumerico(item['Total de litros']);
            }
            return acc;
        }, {});
        const custoLitroPorVeiculo = Object.entries(dadosAgregados).map(([veiculo, dados]) => ({
            veiculo,
            custoLitro: dados.litrosTotal > 0 ? dados.custoTotal / dados.litrosTotal : 0
        })).sort((a, b) => b.custoLitro - a.custoLitro);
        renderizarGrafico('grafico-desempenho-direita', 'bar', custoLitroPorVeiculo.map(d => d.veiculo), custoLitroPorVeiculo.map(d => d.custoLitro), 'Custo por Litro');
    }
}

// --- Funções da Tela de Custos Fixos ---

/**
 * Preenche os menus de filtro na tela de Custos Fixos.
 */
function popularFiltros(dados) {
    const filtroMes = document.getElementById('filtro-mes');
    const filtroEmpresa = document.getElementById('filtro-empresa');
    if(!filtroMes || !filtroEmpresa) return;

    const anoAtual = new Date().getFullYear();
    const dadosAnoAtual = dados.filter(d => d.Ano && parseNumerico(d.Ano) === anoAtual);
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

/**
 * Adiciona o event listener ao botão de filtro da tela de Custos Fixos.
 */
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

/**
 * Atualiza os KPIs e gráficos da tela de Custos Fixos com base nos filtros selecionados.
 */
function atualizarDashboard(dados, filtros) {
    const anoAtual = new Date().getFullYear();
    const dadosAnoInteiro = dados.filter(d => d.Ano && parseNumerico(d.Ano) === anoAtual);
    
    let dadosParaVisao = [...dadosAnoInteiro];
    if (filtros.mes !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Mes.trim() === filtros.mes);
    }
    if (filtros.empresa !== 'Todos') {
        dadosParaVisao = dadosParaVisao.filter(d => d.Empresa.trim() === filtros.empresa);
    }
    
    const custoAnualTotal = dadosAnoInteiro.reduce((soma, item) => soma + parseNumerico(item.ValorGasto), 0);
    const mesesComGastos = [...new Set(dadosAnoInteiro.filter(d => parseNumerico(d.ValorGasto) > 0).map(d => d.Mes))];
    const numeroDeMesesComGastos = mesesComGastos.length > 0 ? mesesComGastos.length : 1;
    const custoMedioMensal = custoAnualTotal / numeroDeMesesComGastos;
    
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
        tituloPainelDireita.textContent = `Médias Gerais - ${filtros.empresa}`;
        
        const dadosDaEmpresaNoAno = dadosAnoInteiro.filter(d => d.Empresa.trim() === filtros.empresa);
        const gastosMensais = Array(12).fill(0);
        dadosDaEmpresaNoAno.forEach(item => {
            const indiceMes = MESES_ORDENADOS.indexOf(item.Mes.trim());
            if (indiceMes !== -1) {
                gastosMensais[indiceMes] = parseNumerico(item.ValorGasto);
            }
        });
        
        const pointColors = Array(12).fill('#3498db');
        if (filtros.mes !== 'Todos') {
            const indiceMesSelecionado = MESES_ORDENADOS.indexOf(filtros.mes);
            if (indiceMesSelecionado !== -1) {
                pointColors[indiceMesSelecionado] = '#e74c3c';
            }
        }
        
        renderizarGrafico('graficoAnualEmpresas', 'line', MESES_ORDENADOS, gastosMensais, `Custo Mensal de ${filtros.empresa}`, pointColors);
        
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

/**
 * Renderiza os cards de veículos na tela de Controle de Frota.
 */
function renderizarPainelFrota(dadosVeiculos) {
    const frotaGrid = document.getElementById('frota-grid');
    if (!frotaGrid) return;
    frotaGrid.innerHTML = '';

    dadosVeiculos.forEach(veiculo => {
        const odometro = parseNumerico(veiculo.Odômetro);
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
        const nomeImagem = veiculo.ImagemURL;
        card.innerHTML = `<div class="status-revisao ${statusMarcador}" title="${statusTexto}"></div>
                          <img src="${CAMINHO_IMAGENS}${nomeImagem}" 
                               onerror="this.onerror=null; this.src='${CAMINHO_IMAGENS}placeholder.png';" 
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
            document.getElementById('detalhe-revisao').textContent = statusTexto;
            document.getElementById('detalhe-cartao').textContent = veiculo.Cartão;

            const itemProcesso = document.getElementById('item-processo');
            const processoSpan = document.getElementById('detalhe-processo');
            const processoUrl = veiculo.Processo_URL;

            if (processoUrl && processoUrl.trim() !== '') {
                itemProcesso.style.display = 'flex';
                processoSpan.innerHTML = `<a href="${processoUrl}" target="_blank">Acessar Processo</a>`;
            } else {
                itemProcesso.style.display = 'none';
            }
            
            document.getElementById('frota-detalhes').classList.add('visivel');
         });
         
        frotaGrid.appendChild(card);
    });

    document.getElementById('fechar-detalhes-frota').addEventListener('click', () => { 
        document.getElementById('frota-detalhes').classList.remove('visivel');
     });
}

// --- Funções da Tela de Contratos (ATUALIZADA) ---

/**
 * Renderiza o slider de contratos na tela correspondente.
 */
function renderizarPainelContratos(dadosContratos) {
    const track = document.getElementById('contratos-slider-track');
    const nav = document.getElementById('contratos-slider-nav');
    const filtroEmpresa = document.getElementById('filtro-contrato-empresa');
    if (!track || !nav || !filtroEmpresa) return;

    track.innerHTML = '';
    nav.innerHTML = '';
    
    // Limpa o timer do slider anterior, se existir
    if (window.sliderTimer) {
        clearInterval(window.sliderTimer);
    }

    const contratosValidos = dadosContratos.filter(c => c['EMPRESA CONTRATADA'] && c['VIGËNCIA']);
    if (contratosValidos.length === 0) return;

    // Popula o dropdown de seleção
    filtroEmpresa.innerHTML = ''; 
    contratosValidos.forEach((contrato, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = contrato['EMPRESA CONTRATADA'];
        filtroEmpresa.appendChild(option);
    });

    contratosValidos.forEach((contrato, index) => {
        const empresa = contrato['EMPRESA CONTRATADA'];
        const vigenciaTexto = contrato['VIGËNCIA'];
        const nomeImagem = contrato.IMAGEM_URL;
        
        // --- Lógica para status do contrato ---
        let statusClasse = 'contrato-ok';
        let statusTexto = 'Em vigor';
        const dataFimTexto = vigenciaTexto ? vigenciaTexto.split(' a ')[1] : null;

        if (dataFimTexto) {
            const [dia, mes, ano] = dataFimTexto.split('/');
            const dataFim = new Date(ano, mes - 1, dia);
            const hoje = new Date();
            const dataAlerta = new Date();
            dataAlerta.setMonth(hoje.getMonth() + 3);

            if (dataFim < hoje) {
                statusClasse = 'contrato-vencido';
                statusTexto = 'Vencido';
            } else if (dataFim <= dataAlerta) {
                statusClasse = 'contrato-alerta';
                statusTexto = 'Vence em breve';
            }
        }

        // --- Criação do Slide ---
        const slide = document.createElement('div');
        slide.className = 'contrato-slide';
        slide.innerHTML = `
            <div class="contrato-status ${statusClasse}" title="${statusTexto}"></div>
            <img src="${CAMINHO_IMAGENS_EMPRESAS}${nomeImagem}" onerror="this.onerror=null; this.src='${CAMINHO_IMAGENS}placeholder.png';" alt="${empresa}">
            <h5>${empresa}</h5>
        `;
        track.appendChild(slide);

        // --- Evento de clique para mostrar detalhes ---
        slide.addEventListener('click', () => {
            const modal = document.getElementById('contrato-detalhes');
            
            // Função auxiliar para preencher os campos
            const preencherDetalhe = (id, valor) => {
                const elemento = document.getElementById(id);
                if (elemento) {
                    elemento.textContent = valor || 'Não informado';
                }
            };

            preencherDetalhe('detalhe-contrato-nome-empresa', contrato['EMPRESA CONTRATADA']);
            preencherDetalhe('detalhe-contrato-gestor', contrato.GESTOR);
            preencherDetalhe('detalhe-contrato-fiscal', contrato.FISCAL);
            preencherDetalhe('detalhe-contrato-suplente', contrato.SUPLENTE);
            preencherDetalhe('detalhe-contrato-cnpj', contrato.CNPJ);
            preencherDetalhe('detalhe-contrato-vigencia', contrato['VIGËNCIA']);
            preencherDetalhe('detalhe-contrato-prorrogacao1', contrato['1ªPRORROGAÇÃO']);
            preencherDetalhe('detalhe-contrato-prorrogacao2', contrato['2ªPRORROGAÇÃO']);
            preencherDetalhe('detalhe-contrato-repactuacao1', contrato['1ªREPACTUAÇÃO']);
            preencherDetalhe('detalhe-contrato-repactuacao2', contrato['2ªREPACTUAÇÃO']);
            preencherDetalhe('detalhe-contrato-responsavel', contrato['RESPONSÁVEL']);
            preencherDetalhe('detalhe-contrato-email', contrato.EMAIL);
            preencherDetalhe('detalhe-contrato-telefone', contrato.TELEFONE);
            
            // Lógica para o link do processo SEI
            const itemProcesso = document.getElementById('item-contrato-processo');
            const spanProcesso = document.getElementById('detalhe-contrato-processo');
            if (contrato.PROCESSO_URL && contrato.PROCESSO_URL.trim() !== '') {
                spanProcesso.innerHTML = `<a href="${contrato.PROCESSO_URL}" target="_blank">Acessar Processo</a>`;
                itemProcesso.style.display = 'list-item';
            } else {
                spanProcesso.innerHTML = 'Não informado';
                itemProcesso.style.display = 'list-item'; 
            }

            modal.classList.add('visivel');
        });

        // --- Criação do Ponto de Navegação ---
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.addEventListener('click', () => goToSlide(index));
        nav.appendChild(dot);
    });
    
    // --- Lógica de Controle do Slider ---
    let slideAtual = 0;
    const slides = document.querySelectorAll('.contrato-slide');
    const dots = document.querySelectorAll('.slider-nav .dot');
    const tempoTotalTela = 120000;
    const intervaloSlide = slides.length > 0 ? tempoTotalTela / slides.length : tempoTotalTela;

    function goToSlide(n) {
        slideAtual = (n + slides.length) % slides.length;
        track.style.transform = `translateX(-${slideAtual * 100}%)`;
        dots.forEach(dot => dot.classList.remove('ativo'));
        dots[slideAtual].classList.add('ativo');
        filtroEmpresa.value = slideAtual;
        reiniciarTimerSlider();
    }

    function proximoSlide() {
        goToSlide(slideAtual + 1);
    }

    function reiniciarTimerSlider() {
        clearInterval(window.sliderTimer);
        window.sliderTimer = setInterval(proximoSlide, intervaloSlide);
    }

    filtroEmpresa.addEventListener('change', () => {
        goToSlide(parseInt(filtroEmpresa.value, 10));
    });

    document.getElementById('fechar-detalhes-contrato').addEventListener('click', () => {
        document.getElementById('contrato-detalhes').classList.remove('visivel');
    });

    goToSlide(0);
}

// =======================================================
// --- FUNÇÃO AUXILIAR PARA RENDERIZAÇÃO DE GRÁFICOS ---
// =======================================================

/**
 * Renderiza um gráfico usando a biblioteca Chart.js em um elemento canvas.
 */
function renderizarGrafico(canvasId, tipo, labels, data, labelDataset, pointColors = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');
    
    if (canvas.chart) { canvas.chart.destroy(); }
    
    const corTextoEixos = '#bdc3c7';
    const backgroundColors = labels.map((label, index) => mapaDeCores[label] || PALETA_DE_CORES[index % PALETA_DE_CORES.length]);
    
    const dataset = {
        label: labelDataset,
        data: data,
        backgroundColor: tipo === 'line' ? '#3498db50' : backgroundColors,
        borderColor: tipo === 'line' ? '#3498db' : backgroundColors,
        borderWidth: tipo === 'line' ? 2 : 1,
        fill: tipo === 'line'
    };

    if (tipo === 'line' && pointColors) {
        dataset.pointBackgroundColor = pointColors;
        dataset.pointRadius = 5;
        dataset.pointHoverRadius = 7;
        dataset.pointBorderColor = '#ffffff';
        dataset.pointBorderWidth = 1;
    }
    
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
                        let valor = context.parsed.y || context.parsed;
                        if(canvasId === 'grafico-custo-km-veiculo'){
                            return `${context.label}: ${formatarMoeda(valor)} / Km`;
                        }
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
            datasets: [dataset]
        },
        options: chartOptions
    });
}