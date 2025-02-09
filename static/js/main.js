class CashFlowGraph {
    constructor() {
        this.nodes = [];
        this.edges = [];
        this.simulation = null;
        this.svg = null;
        this.width = 0;
        this.height = 0;
        this.initializeGraph();
        this.addLoadExampleButton();
        this.setupEventListeners();
        window.addEventListener('resize', () => this.updateDimensions());
    }

    updateDimensions() {
        const container = document.getElementById('graph');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        if (this.svg) {
            this.svg
                .attr('width', this.width)
                .attr('height', this.height);
            
            this.simulation
                .force('center', d3.forceCenter(this.width / 2, this.height / 2));
            
            this.simulation.alpha(1).restart();
        }
    }

    initializeGraph() {
        const container = document.getElementById('graph');
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        this.svg = d3.select('#graph')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        this.svg.append('defs').append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 24)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');

        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id)
                .distance(300)
                .strength(0.5))
            .force('charge', d3.forceManyBody()
                .strength(-3000)
                .distanceMin(150)
                .distanceMax(800))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide()
                .radius(100)  
                .strength(1))
            .force('x', d3.forceX(this.width / 2).strength(0.05))
            .force('y', d3.forceY(this.height / 2).strength(0.05))
            .alphaDecay(0.01);
    }

    updateSimulation() {
        if (!this.svg || this.nodes.length === 0) return;

        this.svg.selectAll('.link, .node, .node-label, .edge-weight').remove();

        const link = this.svg.selectAll('.link')
            .data(this.edges)
            .join('path')
            .attr('class', 'link')
            .style('stroke', d => d.weight < 0 ? '#e74c3c' : '#2ecc71')
            .style('stroke-opacity', 1)
            .style('stroke-width', d => Math.log(Math.abs(d.weight)) * 0.3 + 1)
            .style('stroke-dasharray', d => d.weight < 0 ? '2,2' : 'none')
            .attr('marker-end', 'url(#arrow)');

        const node = this.svg.selectAll('.node')
            .data(this.nodes)
            .join('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', this.dragstarted.bind(this))
                .on('drag', this.dragged.bind(this))
                .on('end', this.dragended.bind(this)));

        node.append('circle')
            .attr('r', 35)
            .style('fill', '#3498db')
            .style('stroke', '#2980b9')
            .style('stroke-width', '2px');

        node.append('text')
            .attr('class', 'node-label')
            .attr('dy', '0.35em')
            .style('text-anchor', 'middle')
            .style('fill', '#fff')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .each(function(d) {
                const text = d3.select(this);
                const words = d.name.split(' ');
                const lineHeight = 1.1;
                const y = text.attr('y');
                
                text.text('');
                
                words.forEach((word, i) => {
                    text.append('tspan')
                        .attr('x', 0)
                        .attr('dy', i === 0 ? -((words.length - 1) * lineHeight) / 2 + 'em' : lineHeight + 'em')
                        .text(word);
                });
            });

        const edgeLabels = this.svg.selectAll('.edge-weight')
            .data(this.edges)
            .join('text')
            .attr('class', 'edge-weight')
            .text(d => {
                const amount = Math.abs(d.baseAmount).toFixed(0);
                const rate = (d.interestRate * 100).toFixed(1);
                return `${amount} @ ${rate}%`;
            })
            .style('fill', '#34495e')
            .style('font-size', '10px')
            .style('font-weight', 'bold');

        this.simulation.on('tick', () => {
            this.nodes.forEach(d => {
                d.x = Math.max(35, Math.min(this.width - 35, d.x));
                d.y = Math.max(35, Math.min(this.height - 35, d.y));
            });

            link.attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy);
                
                const midX = (d.source.x + d.target.x) / 2;
                const midY = (d.source.y + d.target.y) / 2;
                
                return `M${d.source.x},${d.source.y} Q${midX},${midY} ${d.target.x},${d.target.y}`;
            });

            node.attr('transform', d => `translate(${d.x}, ${d.y})`);

            edgeLabels.attr('transform', d => {
                const midX = (d.source.x + d.target.x) / 2;
                const midY = (d.source.y + d.target.y) / 2;
                return `translate(${midX}, ${midY})`;
            });
        });

        this.simulation
            .nodes(this.nodes)
            .force('link').links(this.edges);

        this.simulation.alpha(1).restart();
    }

    addNode() {
        const nameInput = document.getElementById('entityName');
        const name = nameInput.value.trim() || `Entidade ${this.nodes.length + 1}`;
        
        const node = {
            id: this.nodes.length,
            name: name
        };
        
        this.nodes.push(node);
        this.updateEntitySelects();
        this.updateSimulation();
        
        nameInput.value = '';
    }

    updateEntitySelects() {
        const sourceSelect = document.getElementById('sourceEntity');
        const targetSelect = document.getElementById('targetEntity');
        
        sourceSelect.innerHTML = '<option value="">Selecione a Entidade de Origem</option>';
        targetSelect.innerHTML = '<option value="">Selecione a Entidade de Destino</option>';
        
        this.nodes.forEach(node => {
            sourceSelect.add(new Option(node.name, node.id));
            targetSelect.add(new Option(node.name, node.id));
        });
    }

    addEdge() {
        const sourceSelect = document.getElementById('sourceEntity');
        const targetSelect = document.getElementById('targetEntity');
        const baseAmount = document.getElementById('baseAmount');
        const interestRate = document.getElementById('interestRate');
        const transactionType = document.getElementById('transactionType');
        
        if (!sourceSelect.value || !targetSelect.value || !baseAmount.value || !interestRate.value) {
            alert('Por favor, preencha todos os detalhes da transação');
            return;
        }

        const amount = parseFloat(baseAmount.value);
        const rate = parseFloat(interestRate.value) / 100;
        const isDebt = transactionType.value === 'debt';
        
        const weight = isDebt ? 
            -(amount * (1 + rate)) :
            amount * (1 + rate);
        
        const edge = {
            source: parseInt(sourceSelect.value),
            target: parseInt(targetSelect.value),
            weight: weight,
            baseAmount: amount,
            interestRate: rate,
            type: transactionType.value
        };

        this.edges.push(edge);
        this.updateSimulation();
        
        sourceSelect.value = '';
        targetSelect.value = '';
        baseAmount.value = '';
        interestRate.value = '';
        transactionType.value = 'debt';
    }

    analyze() {
        if (this.nodes.length === 0 || this.edges.length === 0) {
            document.getElementById('results').innerHTML = `
                <h3>Resultados da Análise</h3>
                <p>Por favor, adicione algumas entidades e transações primeiro.</p>
            `;
            return;
        }

        const edgesForAnalysis = this.edges.map(edge => ({
            source: typeof edge.source === 'object' ? edge.source.id : edge.source,
            target: typeof edge.target === 'object' ? edge.target.id : edge.target,
            weight: edge.weight
        }));

        fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nodes: this.nodes,
                edges: edgesForAnalysis
            })
        })
        .then(response => response.json())
        .then(data => {
            let resultsHtml = '<h3>Resultados da Análise</h3>';
            
            if (data.has_negative_cycle) {
                resultsHtml += `
                    <div class="note">
                        <strong>Oportunidade de Arbitragem Detectada!</strong>
                        <p>Existe uma sequência de transações que pode gerar lucro através de arbitragem.</p>
                        <p>Ciclo: ${data.negative_cycle.join(' → ')}</p>
                    </div>
                `;

                if (document.getElementById('showNegativeCycles').checked) {
                    this.highlightNegativeCycle(data.negative_cycle);
                } else {
                    this.resetHighlighting();
                }
            } else {
                this.resetHighlighting();
                resultsHtml += `
                    <p>Nenhuma oportunidade de arbitragem encontrada.</p>
                    <p>Caminhos mais curtos a partir do nó ${this.nodes[data.source].name}:</p>
                    <ul>
                `;
                
                Object.entries(data.distances).forEach(([node, distance]) => {
                    if (node !== data.source.toString()) {
                        resultsHtml += `<li>Para ${this.nodes[node].name}: ${Math.abs(distance).toFixed(2)}</li>`;
                    }
                });
                
                resultsHtml += '</ul>';
            }
            
            document.getElementById('results').innerHTML = resultsHtml;
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('results').innerHTML = `
                <h3>Erro na Análise</h3>
                <p>Ocorreu um erro ao analisar a rede de fluxo de caixa.</p>
            `;
        });
    }

    resetHighlighting() {
        this.svg.selectAll('.link')
            .style('stroke-opacity', 1)
            .style('stroke-width', d => Math.log(Math.abs(d.weight)) * 0.3 + 1);
    }

    highlightNegativeCycle(cycle) {
        this.svg.selectAll('.link')
            .style('stroke-opacity', 0.2)
            .style('stroke-width', d => Math.log(Math.abs(d.weight)) * 0.3 + 1);

        for (let i = 0; i < cycle.length - 1; i++) {
            const source = parseInt(cycle[i]);
            const target = parseInt(cycle[i + 1]);
            
            this.svg.selectAll('.link')
                .filter(d => {
                    const s = typeof d.source === 'object' ? d.source.id : d.source;
                    const t = typeof d.target === 'object' ? d.target.id : d.target;
                    return s === source && t === target;
                })
                .style('stroke-opacity', 1)
                .style('stroke-width', d => Math.log(Math.abs(d.weight)) * 0.3 + 3);
        }
    }

    addLoadExampleButton() {
        const analysisControls = document.querySelector('.analysis-controls');
        
        const loadExampleBtn = document.createElement('button');
        loadExampleBtn.id = 'loadExample';
        loadExampleBtn.textContent = 'Carregar Cenário de Exemplo';
        analysisControls.insertBefore(loadExampleBtn, document.getElementById('analyze'));
        loadExampleBtn.addEventListener('click', () => this.loadExampleScenario());

        const clearDataBtn = document.createElement('button');
        clearDataBtn.id = 'clearData';
        clearDataBtn.textContent = 'Limpar Todos os Dados';
        analysisControls.insertBefore(clearDataBtn, document.getElementById('analyze'));
        clearDataBtn.addEventListener('click', () => this.clearData());
    }

    clearData() {
        this.nodes = [];
        this.edges = [];

        this.updateEntitySelects();

        if (this.svg) {
            this.svg.selectAll('.link, .node, .node-label, .edge-weight').remove();
        }

        document.getElementById('entityName').value = '';
        document.getElementById('baseAmount').value = '';
        document.getElementById('interestRate').value = '';
        document.getElementById('transactionType').value = 'debt';
        
        document.getElementById('showNegativeCycles').checked = false;

        document.getElementById('results').innerHTML = `
            <h3>Dados Limpos</h3>
            <p>Todas as entidades e transações foram removidas.</p>
        `;

        if (this.simulation) {
            this.simulation.stop();
        }
    }

    loadExampleScenario() {
        this.nodes = [];
        this.edges = [];

        const entities = [
            "Banco A",
            "Fundo de Investimento",
            "Empresa Tech",
            "Banco Global",
            "Empresa Trading",
            "Capital de Risco"
        ];

        entities.forEach(name => {
            this.nodes.push({
                id: this.nodes.length,
                name: name
            });
        });

        const transactions = [
            { source: 0, target: 1, amount: 10000, rate: 5, type: 'debt' },     // Banco A -> Fundo de Investimento: 5% empréstimo
            { source: 1, target: 2, amount: 12000, rate: 7, type: 'debt' },     // Fundo de Investimento -> Empresa Tech: 7% empréstimo
            { source: 2, target: 3, amount: 15000, rate: 4, type: 'debt' },     // Empresa Tech -> Banco Global: 4% empréstimo
            { source: 3, target: 0, amount: 14000, rate: 3, type: 'debt' },     // Banco Global -> Banco A: 3% empréstimo

            { source: 4, target: 1, amount: 8000, rate: 6, type: 'earning' },   // Empresa Trading -> Fundo de Investimento: 6% retorno
            { source: 1, target: 5, amount: 20000, rate: 8, type: 'earning' },  // Fundo de Investimento -> Capital de Risco: 8% retorno
            { source: 5, target: 2, amount: 18000, rate: 5, type: 'debt' },     // Capital de Risco -> Empresa Tech: 5% empréstimo
            { source: 3, target: 4, amount: 9000, rate: 4, type: 'debt' },      // Banco Global -> Empresa Trading: 4% empréstimo
            { source: 4, target: 5, amount: 11000, rate: 7, type: 'earning' },  // Empresa Trading -> Capital de Risco: 7% retorno
        ];

        transactions.forEach(t => {
            const weight = t.type === 'debt' ? 
                -(t.amount * (1 + t.rate/100)) : 
                t.amount * (1 + t.rate/100);

            this.edges.push({
                source: t.source,
                target: t.target,
                weight: weight,
                baseAmount: t.amount,
                interestRate: t.rate/100,
                type: t.type
            });
        });

        this.updateEntitySelects();
        this.updateSimulation();

        document.getElementById('results').innerHTML = `
            <h3>Cenário de Exemplo Complexo Carregado</h3>
            <p>Uma rede financeira foi criada com:</p>
            <ul>
                <li>6 entidades financeiras (bancos, empresas e fundos de investimento)</li>
                <li>9 transações com taxas de juros variadas (3% a 8%)</li>
                <li>Mistura de empréstimos e retornos de investimento</li>
                <li>Oportunidade de arbitragem oculta - tente encontrar!</li>
            </ul>
            <p>Clique em "Analisar Fluxo de Caixa" para detectar oportunidades de arbitragem e analisar a rede.</p>
        `;
    }

    setupEventListeners() {
        document.getElementById('addNode').addEventListener('click', () => this.addNode());
        document.getElementById('addEdge').addEventListener('click', () => this.addEdge());
        document.getElementById('analyze').addEventListener('click', () => this.analyze());
        
        document.getElementById('showNegativeCycles').addEventListener('change', (e) => {
            if (!e.target.checked) {
                this.resetHighlighting();
                this.updateSimulation();
            } else {
                this.analyze();
            }
        });
    }

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const graph = new CashFlowGraph();
});