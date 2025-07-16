// =======================================================
// --- CONFIGURAÇÃO INICIAL ---
// =======================================================

// Aqui colocamos as URLs das nossas planilhas publicadas como CSV.
// É importante substituir o texto de exemplo pela URL real gerada pelo Google Sheets.
const URL_CUSTOS_FIXOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSjgz3LwM4EZ_aE0awS6p_0R6XGKysv8CEswX1RtYkP13hM6T-spibHXYNfvZ0QRPN1mjv0-ypVDmY2/pub?output=csv'; // Planilha de custos fixos.
// const URL_ORCAMENTO = 'URL_DA_SUA_PLANILHA_DE_ORCAMENTO_AQUI'; // Para a futura tela de orçamento.
// const URL_CONTRATOS = 'URL_DA_SUA_PLANILHA_DE_CONTRATOS_AQUI'; // Para a futura tela de contratos.

// Variáveis de configuração que podemos alterar facilmente.
const ANO_ATUAL = 2025; // O ano que queremos analisar.
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MES_ATUAL = MESES[new Date().getMonth()]; // Pega o mês atual do sistema, ex: "Janeiro", "Fevereiro", etc.

// =======================================================
// --- PONTO DE PARTIDA DA APLICAÇÃO ---
// =======================================================

// Esta linha garante que nosso código JavaScript só vai rodar DEPOIS que toda a página HTML for carregada.
document.addEventListener('DOMContentLoaded', iniciarDashboard);

// Esta é a função principal que orquestra tudo.
async function iniciarDashboard() {
    // 1. Tenta carregar os dados da planilha de custos fixos.
    const dadosCustosFixos = await carregarDados(URL_CUSTOS_FIXOS);

    // 2. Se os dados foram carregados com sucesso...
    if (dadosCustosFixos) {
        // ...chama a função para renderizar (desenhar) o painel de custos fixos.
        renderizarPainelCustosFixos(dadosCustosFixos);
    }

    // 3. Inicia a rotação automática das telas a cada 2 minutos (120000 milissegundos).
    iniciarRotacao(120000); // 2 minutos de rotação entre telas.
}

// =======================================================
// --- FUNÇÕES DE LÓGICA ---
// =======================================================

/**
 * Função responsável por buscar os dados de uma URL (nossa planilha CSV).
 * @param {string} url - O link da planilha publicada como CSV.
 * @returns {Promise<Array|null>} - Retorna uma lista de objetos com os dados, ou nulo se der erro.
 */
async function carregarDados(url) {
    // Verifica se a URL foi configurada, para não dar erro.
    if (!url || url.includes('URL_DA_SUA_PLANILHA')) {
        console.warn(`URL não configurada: ${url}`); // Avisa no console do navegador (F12).
        return null;
    }
    try {
        // 'fetch' é a forma moderna do JavaScript de fazer uma requisição web.
        const resposta = await fetch(url);
        // Pega o conteúdo da resposta como texto puro.
        const textoCsv = await resposta.text();
        // Usa a biblioteca PapaParse para transformar o texto CSV em uma estrutura de dados organizada.
        const {
            data
        } = Papa.parse(textoCsv, {
            header: true, // Diz que a primeira linha do CSV é o cabeçalho.
            dynamicTyping: true, // Tenta converter números e outros tipos automaticamente.
            skipEmptyLines: true // Ignora linhas em branco na planilha.
        });
        return data; // Retorna os dados prontos para uso.
    } catch (erro) {
        console.error(`Erro ao carregar dados da URL: ${url}`, erro); // Mostra um erro detalhado no console.
        return null;
    }
}

/**
 * Processa os dados de custos fixos e atualiza a tela principal com os cards e gráficos.
 * @param {Array} dados - A lista de dados vinda da planilha.
 */
function renderizarPainelCustosFixos(dados) {
    // --- LÓGICA DOS CARDS ---
    // 1. Filtra os dados para pegar apenas os do ano que configuramos (ANO_ATUAL).
    const dadosAnoAtual = dados.filter(d => d.Ano === ANO_ATUAL);

    // 2. Calcula os valores para os cards de resumo.
    const custoAnualTotal = dadosAnoAtual.reduce((soma, item) => soma + item.ValorGasto, 0);
    const custoMesAtual = dadosAnoAtual.filter(d => d.Mes === MES_ATUAL).reduce((soma, item) => soma + item.ValorGasto, 0);
    const mesesPassados = MESES.indexOf(MES_ATUAL) + 1; // Calcula quantos meses se passaram.
    const custoMedioMensal = custoAnualTotal > 0 ? custoAnualTotal / mesesPassados : 0;

    // 3. Atualiza o texto dos cards na tela com os valores calculados e formatados como moeda.
    document.getElementById('custo-anual-total').textContent = formatarMoeda(custoAnualTotal);
    document.getElementById('custo-mes-atual').textContent = formatarMoeda(custoMesAtual);
    document.getElementById('custo-medio-mensal').textContent = formatarMoeda(custoMedioMensal);


    // --- LÓGICA DOS GRÁFICOS ---
    // 4. Agrupa os gastos por empresa para o ano todo.
    const gastosPorEmpresa = dadosAnoAtual.reduce((acc, item) => {
        if (!acc[item.Empresa]) {
            acc[item.Empresa] = 0;
        }
        acc[item.Empresa] += item.ValorGasto;
        return acc;
    }, {});

    // 5. Prepara os dados para o gráfico de Pizza.
    const labelsEmpresas = Object.keys(gastosPorEmpresa);
    const dataEmpresas = Object.values(gastosPorEmpresa);
    renderizarGrafico('graficoAnualEmpresas', 'pie', labelsEmpresas, dataEmpresas, 'Gasto Anual por Empresa');

    // 6. Prepara os dados para o gráfico de Barras "Top 5".
    const top5Gastos = Object.entries(gastosPorEmpresa)
        .sort(([, a], [, b]) => b - a) // Ordena do maior para o menor gasto.
        .slice(0, 5); // Pega apenas os 5 primeiros.

    const labelsTop5 = top5Gastos.map(item => item[0]); // Nomes das 5 maiores empresas.
    const dataTop5 = top5Gastos.map(item => item[1]); // Valores das 5 maiores empresas.
    renderizarGrafico('graficoEvolucaoMensal', 'bar', labelsTop5, dataTop5, 'Top 5 Maiores Custos');
}

/**
 * Função genérica e reutilizável para desenhar qualquer tipo de gráfico.
 * @param {string} canvasId - O id do elemento <canvas> no HTML onde o gráfico será desenhado.
 * @param {string} tipo - O tipo de gráfico (ex: 'pie', 'bar', 'line').
 * @param {Array} labels - A lista de nomes para o eixo X ou para as fatias da pizza.
 * @param {Array} data - A lista de valores numéricos correspondentes.
 * @param {string} labelDataset - O título do conjunto de dados (usado em tooltips).
 */
function renderizarGrafico(canvasId, tipo, labels, data, labelDataset) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { // Verificação de segurança
        console.error(`Elemento canvas com id "${canvasId}" não foi encontrado.`);
        return;
    }
    const ctx = canvas.getContext('2d'); // Pega o "contexto de desenho" do canvas.

    // Se já existir um gráfico neste canvas, destrói ele antes de criar um novo. Evita bugs.
    if (canvas.chart) {
        canvas.chart.destroy();
    }

    // --- CONFIGURAÇÕES DE APARÊNCIA DO GRÁFICO ---
    const corTextoEixos = '#bdc3c7';
    const CORES_GRAFICO = ['#3498db', '#e74c3c', '#9b59b6', '#f1c40f', '#2ecc71', '#1abc9c', '#e67e22'];

    const chartOptions = {
        responsive: true, // Faz o gráfico se adaptar ao tamanho do container.
        maintainAspectRatio: false, // Permite que o gráfico preencha o container sem manter uma proporção fixa.
        plugins: {
            legend: { // Configurações da legenda.
                display: tipo === 'pie', // Só mostra a legenda para o gráfico de pizza.
                position: 'right', // Posição da legenda.
                labels: {
                    color: corTextoEixos, // Cor do texto da legenda.
                }
            },
            tooltip: { // Configuração da "dica" que aparece ao passar o mouse.
                callbacks: {
                    label: function(context) {
                        const valor = context.parsed.y || context.parsed;
                        // Se for um gráfico de pizza, mostra o valor e a porcentagem.
                        if (context.chart.config.type === 'pie') {
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const porcentagem = ((valor / total) * 100).toFixed(1);
                            return `${context.label}: ${formatarMoeda(valor)} (${porcentagem}%)`;
                        }
                        // Para outros gráficos, mostra apenas o valor formatado.
                        return `${context.dataset.label}: ${formatarMoeda(valor)}`;
                    }
                }
            }
        },
        scales: (tipo === 'bar' || tipo === 'line') ? { // Só cria eixos para gráficos de barra ou linha.
            x: { // Eixo X (horizontal).
                ticks: {
                    color: corTextoEixos
                }, // Cor do texto.
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                } // Cor das linhas de grade.
            },
            y: { // Eixo Y (vertical).
                ticks: {
                    color: corTextoEixos,
                    callback: function(value) {
                        return formatarMoeda(value);
                    } // Formata os números do eixo como moeda.
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        } : {} // Para pizza, não usa eixos.
    };

    // Cria o novo gráfico com todas as configurações.
    canvas.chart = new Chart(ctx, {
        type: tipo,
        data: {
            labels: labels,
            datasets: [{
                label: labelDataset,
                data: data,
                backgroundColor: CORES_GRAFICO, // Usa a nossa lista de cores.
                borderColor: CORES_GRAFICO,
                borderWidth: 1
            }]
        },
        options: chartOptions
    });
}

/**
 * Função auxiliar para formatar um número como moeda brasileira (BRL).
 * @param {number} valor - O número a ser formatado.
 * @returns {string} - O valor formatado como "R$ 1.234,56".
 */
function formatarMoeda(valor) {
    if (typeof valor !== 'number') return valor;
    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

/**
 * Controla a rotação automática entre as diferentes telas do dashboard.
 * @param {number} intervalo - O tempo em milissegundos para trocar de tela.
 */
function iniciarRotacao(intervalo) {
    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return; // Não faz nada se só tiver uma tela.

    let telaAtual = 0; // Começa na primeira tela (índice 0).

    // 'setInterval' executa uma função repetidamente a cada X milissegundos.
    setInterval(() => {
        // 1. Remove a classe "ativo" da tela que está visível.
        telas[telaAtual].classList.remove('ativo');

        // 2. Calcula o índice da próxima tela. O operador '%' faz com que volte ao início (0) após a última tela.
        telaAtual = (telaAtual + 1) % telas.length;

        // 3. Adiciona a classe "ativo" para a nova tela, fazendo ela aparecer.
        telas[telaAtual].classList.add('ativo');
    }, intervalo);
}