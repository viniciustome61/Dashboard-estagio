// --- CONFIGURAÇÃO INICIAL ---
// Substitua estas URLs pelas URLs geradas pelas suas planilhas no Google Sheets
// Lembre-se: Arquivo > Compartilhar > Publicar na web > Selecione a página > Formato CSV
const URL_ORCAMENTO = 'URL_DA_SUA_PLANILHA_DE_ORCAMENTO_AQUI';
const URL_CONTRATOS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSLVaScEEmPUg-e0BYlhS_FJ0MpF55i1OeEEQfvyEicMp21r4ijm4spvWI3svP0A/pub?gid=1305007631&single=true&output=csv';
// const URL_VEICULOS = 'URL_DA_SUA_PLANILHA_DE_VEICULOS_AQUI'; // Descomente quando tiver a planilha

// --- FUNÇÃO PRINCIPAL QUE RODA QUANDO A PÁGINA CARREGA ---
document.addEventListener('DOMContentLoaded', () => {
    iniciarDashboard();
});

async function iniciarDashboard() {
    // Carrega os dados das planilhas em paralelo para mais velocidade
    const [dadosOrcamento, dadosContratos] = await Promise.all([
        carregarDados(URL_ORCAMENTO),
        carregarDados(URL_CONTRATOS),
        // carregarDados(URL_VEICULOS) // Descomente quando tiver a planilha
    ]);

    // Se os dados foram carregados com sucesso, renderiza os painéis
    if (dadosOrcamento) {
        renderizarPainelOrcamento(dadosOrcamento);
    }
    if (dadosContratos) {
        renderizarPainelContratos(dadosContratos);
    }
    // if (dadosVeiculos) { ... }

    // Inicia a rotação das telas a cada 20 segundos
    iniciarRotacao(20000); 
}

// --- 1. FUNÇÕES DE CARREGAMENTO DE DADOS ---
async function carregarDados(url) {
    // Se a URL for o placeholder, retorna nulo para não dar erro
    if (!url || url.includes('URL_DA_SUA_PLANILHA')) {
        console.warn(`URL não configurada: ${url}`);
        return null;
    }
    try {
        const resposta = await fetch(url);
        const textoCsv = await resposta.text();
        // Usa o PapaParse para converter o texto CSV em um array de objetos
        const { data } = Papa.parse(textoCsv, { header: true, dynamicTyping: true });
        return data;
    } catch (erro) {
        console.error(`Erro ao carregar dados da URL: ${url}`, erro);
        return null; // Retorna nulo em caso de erro
    }
}

// --- 2. FUNÇÕES DE RENDERIZAÇÃO DE CADA PAINEL ---

// PAINEL DE ORÇAMENTO
function renderizarPainelOrcamento(dados) {
    // Cálculos dos cards de resumo
    const totalOrcado = dados.reduce((soma, item) => soma + item.Orcamento, 0);
    const totalGasto = dados.reduce((soma, item) => soma + item.Gasto, 0);
    const percentualExecucao = totalOrcado > 0 ? (totalGasto / totalOrcado) * 100 : 0;

    // Atualiza os textos dos cards no HTML
    document.getElementById('total-orcado').textContent = totalOrcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-gasto').textContent = totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('percentual-execucao').textContent = `${percentualExecucao.toFixed(1)}%`;

    // Prepara os dados para o gráfico
    const labels = dados.map(item => item.Diretoria);
    const dataGastos = dados.map(item => item.Gasto);

    // Renderiza o gráfico com Chart.js
    const ctx = document.getElementById('graficoOrcamento').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gasto Atual',
                data: dataGastos,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

// PAINEL DE CONTRATOS
function renderizarPainelContratos(dados) {
    const container = document.getElementById('lista-contratos');
    container.innerHTML = ''; // Limpa o conteúdo anterior
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // Zera a hora para comparar apenas os dias

    dados.forEach(contrato => {
        // Converte a data do formato DD/MM/AAAA para um objeto Date
        const partesData = contrato.DataFim.split('/');
        const dataFim = new Date(+partesData[2], partesData[1] - 1, +partesData[0]);
        
        const diffTempo = dataFim.getTime() - hoje.getTime();
        const diffDias = Math.ceil(diffTempo / (1000 * 60 * 60 * 24));

        if (diffDias <= 30) { // Alerta para contratos vencendo em 30 dias ou já vencidos
            const divAlerta = document.createElement('div');
            divAlerta.classList.add('alerta');
            
            let mensagem = '';
            if (diffDias < 0) {
                divAlerta.classList.add('vencido');
                mensagem = `<strong>${contrato.Empresa}:</strong> Contrato de ${contrato.Servico} <strong>venceu há ${Math.abs(diffDias)} dias</strong>.`;
            } else {
                divAlerta.classList.add('vencendo');
                mensagem = `<strong>${contrato.Empresa}:</strong> Contrato de ${contrato.Servico} vence em <strong>${diffDias} dias</strong> (${dataFim.toLocaleDateString('pt-BR')}).`;
            }

            const p = document.createElement('p');
            p.innerHTML = mensagem;
            divAlerta.appendChild(p);
            container.appendChild(divAlerta);
        }
    });
}

// --- 3. FUNÇÃO DE ROTAÇÃO DAS TELAS ---
function iniciarRotacao(intervalo) {
    const telas = document.querySelectorAll('.dashboard-tela');
    if (telas.length <= 1) return; // Não rotaciona se só tiver 1 tela

    let telaAtual = 0;

    setInterval(() => {
        // Remove a classe 'ativo' da tela atual
        telas[telaAtual].classList.remove('ativo');

        // Calcula o índice da próxima tela
        telaAtual = (telaAtual + 1) % telas.length;

        // Adiciona a classe 'ativo' para a nova tela, tornando-a visível
        telas[telaAtual].classList.add('ativo');
    }, intervalo);
}